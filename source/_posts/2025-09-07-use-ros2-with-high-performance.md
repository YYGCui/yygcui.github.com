---
title: ROS2高性能使用
date: 2025-09-07 16:12:49
header-img: images/header/river-cloud2.jpg
tags:
- 性能优化
- 智能驾驶
- ROS2
categories:
- 技术积累
comments: true
---
在做性能优化时，发现 ros::spin 的线程有些节点的 CPU 占比比较大，通过 perf 抓取性能日志分析，主要集中在几点：subscription 注册的 callback 消耗大，subscription 时反序列化操作消耗大，publish 时存在一定的动态内存消耗等等。为优化以上性能热点，我们先简单分析一下源码，看看 ROS2 的实现机制。

## 源码分析
### spin流程
在业务节点中 create_subsription 注册 callback，并 spin 后，ros 线程的调用链大致如下，等待消息，轮询或者事件触发，调用 subscription 处理队列里的消息，消息进入回调，最终调用用户注册的 callback 执行并等待完成。
```
用户 callback
   ↑
AnySubscriptionCallback::dispatch
   ↑
SubscriptionBase::handle_message
   ↑
Executor::execute_ready_executables
   ↑
Executor::spin_once (wait_set 触发)
   ↑
rclcpp::spin(node)
```
### callback
其 dispatch 源码摘录如下，这里通过 shared_ptr 传入 message，根据 用户 注册的 callback 参数类型，传入相应的引用或者指针类型。这里可以看到 callback 调用结束才能走下去结束 dispatch。

```cpp
void dispatch(std::shared_ptr<MessageT> message, const rclcpp::MessageInfo & message_info) {
  ... // 省略部分
  std::visit(
      [&message, &message_info, this](auto && callback) {
        using T = std::decay_t<decltype(callback)>;

        if constexpr (std::is_same_v<T, ConstRefCallback>) {
          callback(*message);
        } else if constexpr (std::is_same_v<T, ConstRefWithInfoCallback>) {
          callback(*message, message_info);
        } else if constexpr (std::is_same_v<T, UniquePtrCallback>) {
          callback(create_unique_ptr_from_shared_ptr_message(message));
        } else if constexpr (std::is_same_v<T, UniquePtrWithInfoCallback>) {
          callback(create_unique_ptr_from_shared_ptr_message(message), message_info);
        } else if constexpr (  // NOLINT[readability/braces]
          std::is_same_v<T, SharedConstPtrCallback>||
          std::is_same_v<T, ConstRefSharedConstPtrCallback>||
          std::is_same_v<T, SharedPtrCallback>)
        {
          callback(message);
        } else if constexpr (  // NOLINT[readability/braces]
          std::is_same_v<T, SharedConstPtrWithInfoCallback>||
          std::is_same_v<T, ConstRefSharedConstPtrWithInfoCallback>||
          std::is_same_v<T, SharedPtrWithInfoCallback>)
        {
          callback(message, message_info);
        } else {
          static_assert(always_false_v<T>, "unhandled callback type");
        }
      }, callback_variant_);
    ... // 省略部分
}
```
### publish
publish 函数有两个重载实现，一个是通过引用，一个是通过智能指针。从我们摘取的代码片段，逐一分析下这俩函数：
- 引用传参： 没有开启 intra_process 时，直接走 inter_process；开启 intra_process 时，拷贝 msg 到 unique_ptr，然后调用 unique_ptr 参数函数重载。
- 智能指针传参： 没有开启 intra_process 时，直接走 inter_process。开启 intra_process 时，如果总订阅数多于进程内订阅数，将 unique_ptr 转成 shared_ptr，进程内走 intra_process，shared_msg 给进程间走 inter_process；否则直接走 intra_process。

```cpp 
void publish(const MessageT & msg) {
    // RCUTILS_LOG_WARN_NAMED(ROS_PACKAGE_NAME_RCLCPP,
    //                        "[PUB]publish msg START for topic: %s of node: %s",
    //                         get_topic_name(), node_name_.c_str());
    auto start = std::chrono::steady_clock::now();
    // Avoid allocating when not using intra process.
    if (!intra_process_is_enabled_) {
      // In this case we're not using intra process.
      return this->do_inter_process_publish(msg);
    }
    // Otherwise we have to allocate memory in a unique_ptr and pass it along.
    // As the message is not const, a copy should be made.
    // A shared_ptr<const MessageT> could also be constructed here.
    auto ptr = MessageAllocatorTraits::allocate(*message_allocator_.get(), 1);
    MessageAllocatorTraits::construct(*message_allocator_.get(), ptr, msg);
    MessageUniquePtr unique_msg(ptr, message_deleter_);
    this->publish(std::move(unique_msg));
    ...
}
```

```cp
void publish(std::unique_ptr<MessageT, MessageDeleter> msg) {
    ...
    if (!intra_process_is_enabled_) {
      this->do_inter_process_publish(*msg);
      return;
    }
    // If an interprocess subscription exist, then the unique_ptr is promoted
    // to a shared_ptr and published.
    // This allows doing the intraprocess publish first and then doing the
    // interprocess publish, resulting in lower publish-to-subscribe latency.
    // It's not possible to do that with an unique_ptr,
    // as do_intra_process_publish takes the ownership of the message.
    bool inter_process_publish_needed =
      get_subscription_count() > get_intra_process_subscription_count();

    if (inter_process_publish_needed) {
      auto shared_msg = this->do_intra_process_publish_and_return_shared(std::move(msg));
      this->do_inter_process_publish(*shared_msg);
    } else {
      this->do_intra_process_publish(std::move(msg));
    }
    ...
```

## 优化方法

### 降时延

节点内 spin 流程是单线程处理的，也就是说该节点的所有 subscription 的 callback 是串行调用的， callback 的处理时间直接影响该节点的整体时间。
那么这里优化方式比较直接，callback 只做消息的接收，不执行逻辑处理，处理由其他线程来做。

```cpp
void MsgCallback(const xxx::msg::xxx::ConstSharedPtr msg) {
   ...
   // 简单举例，把 msg 指针存一下供其他线程使用
   xxx_msg_ = msg;
   ...
}
```

### 减拷贝

上面分析了 publish 的两个方法，可以看到如果使用引用传参，在进程内通信下会多一次拷贝；然后在智能指针传参时，跨进程通信再多一次拷贝。这里我们可以通过使用 unique_ptr 传参直接减免一次拷贝。

```cpp
\\ 示例：
std::unique_ptr<xxx::msg> msg;
msg->xxx = xxx;
node->publish(std::move(msg));
```

### 共享内存

[进程内通信](https://design.ros2.org/articles/intraprocess_communications.html) 可以使进程内的 pub - sub 间直接共享内存，减少了消息拷贝、序列化、反序列化的资源使用。打开进程内通信的方式如下：

```cpp
\\ 示例：
rclcpp::NodeOptions node_options;
node_options.use_intra_process_comms(true);

\\ 使用示例1 - 直接创建node：
rclcpp::Node::SharedPtr node = rclcpp::Node::make_shared("node_name", "/namespace", node_options);

\\ 使用示例2 - XXXNode继承rclcpp node：
class XXXNode : public rclcpp::Node {
public:
    XXXNode(const std::string &node_name, const std::string &name_space, const rclcpp::NodeOptions& node_options)
    : rclcpp::Node(node_name, name_space, node_options) {....}
    
XXXNode node = std::make_shared<XXXNode>("node_name", "/namespace", option);
```

**特别注意**：需要确保进程内订阅消息时不会修改原消息，因为该启用配置后进程内 publish 节点 和所有 subcription 节点是共享内存使用的。

callback 要求参数两层const保证指针和消息内容无法被修改，如果通过指针传递给其他方法都应该是 const，不要 cast 掉。

```cpp
\\ 第一个const 保证 ptr不能被修改
\\ 第二个const/ConstSharedPtr 保证 ptr 指向的内容不能被修改.
void callback(const xxx::msg::yyy::ConstSharedPtr msg) {
    ...
}
\\ 或
void callback(const std::shared_ptr<xxx::msg::yyy const> msg {
    ...
}
```
两种类型的区别如下：

| 类型               | 特点 | 推荐场景                                                  |
| ---------------- | ------- | ----------------------------------------------------- |
| `SharedPtr`      | 可以修改消息      | 你确实要在回调里修改消息（**极少见**），或者想要传给其他 API 要求 `shared_ptr<T>` |
| `ConstSharedPtr` | 不可以修改消息     | **绝大多数情况**，订阅者只是读取消息，不修改内容                            |


### 代理订阅
前面讲到进程内通信可以实现零拷贝，免序列化反序列化。很多场景下，我们是进程内的各个节点 subscribe 了另一个进程的 publish 的 msg，这种模式下，每个 subscribe 的节点都要反序列化一份，增加了重复的资源消耗。

如何避免这种情况，去掉重复的反序列化资源消耗呢？ 我们可以增加一个中继节点 node_relay，来接收 process1 进程 publish 的 /ns1/topic1，在 process2 中 通过 node_relay 共享给所有同进程内订阅的节点，间接实现 intra_process 通信。如下图：

<img width="450" height="171" alt="ros_relay_agent" src="/images/ros2/ros2-relay-node.jpg" />

由于新增加了一个额外的节点，所以在引入这种优化方式时，需要评估下该中继节点的资源消耗，和其他节点反序列化消耗。取最优解，可能收到 subscription 的数量、msg 的大小、topic 的帧率等的影响。

在开发实现中，process2 里的节点可以按实际情况订阅`/ns1/topic1`, 通过 remap 配置屏蔽掉`/relay_ns1/topic1`的差异，以方便上述性能评估，及后续的其他组合。
```bash
// 命令行参数
./bin/process2 --ros-args -r /ns1/topic1:=/relay_ns1/topic1
```
上述 remap 作用于 process2 里的所有节点，我们只期望作用域 node2* 节点，中继节点还要正常处理 /ns1/topic1，所以中继节点需要屏蔽掉参数设置。
```cpp
// 中继节点重建node示例
rclcpp::NodeOptions node_options;
node_options.use_global_arguments(false); // 屏蔽全局参数
node_options.use_intra_process_comms(true);

\\ 使用示例1 - 直接创建node：
rclcpp::Node::SharedPtr relay_node = rclcpp::Node::make_shared("node_name", "/ns1", node_options);
...
```

*注：在实际使用中，发现即使开启了进程内通信，并配置了代理订阅，subscription 还是有反序列化的存在，这是 ROS 底层 DDS 通信层导致的。这里可能需要二开才能解决，暂且不表。*


## 参考资料
- [ros2 源代码](https://github.com/ros2/ros2)
- [ros2 进程内通信](https://design.ros2.org/articles/intraprocess_communications.html)
