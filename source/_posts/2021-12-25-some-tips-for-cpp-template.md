---
title: 使用C++模板的一些技巧
date: 2021-12-25 21:45:06
tags:
- C/C++
categories:
- 技术积累
comments: true
---
## 模板是什么
{% blockquote https://zh.wikipedia.org/wiki/%E6%A8%A1%E6%9D%BF_(C%2B%2B) %}

模板（Template）在C++ 程序设计语言中，是指函数模板与类模板[1]，是一种参数化类型机制。Java和C＃中的泛型与C++ 的模板大体对应，但也有一些功能上的显著差异（C++ 模板支持两者没有明确对应的模板模板参数和模板非类型参数，但不支持Java的通配符以及C#的泛型类型约束）。模板是C++ 的泛型编程中不可缺少的一部分。

{% endblockquote %}

简单说，模板的基本用法是可以简化参数类型不同但逻辑相同的代码，特别是不同参数类型的重载函数。

## 遇到的问题
最近有一个特性遇到了一些问题，帮他们优化，顺便整理一下。这个特性由原来的单个action变成了多个action，这里遇到一个问题，就是有一个入参对象需要和对应的action做关联更新，只存一份这个对象无法满足需求，而对象又比较大，拷贝多份的话，浪费了大量内存。最后的方案是把会更新的部分单独拿出来做了多份，只读的部分还是共用原来这个对象，最后把更新的部分整合回去给下游用。简单用伪码表示如下：
```
# 原对象结构
struct Example1 {
    type var1; // 更新
    type var2; // 更新
    ...
    type varn; // 只读
};
# 多份对象结构
struct NewExample1 {
    type var1;
    type var2;
    ...
    Example1* e1; // 只读
};
```
为了不影响原有的功能，特性算法开发直接把相关函数拷贝出来一份，使用新对象作为参数，拷贝一份是因为类型不一样了，且读取数据的方式也不同。这样带来一个问题，每次特性分支同步主干时，这部分拷贝出来的代码都不会被更新，需要人工和原函数校对修改，同时大量的重复代码也给维护代码带来了很大的成本。

实际上，这两种类型的处理逻辑是一样的，只是类型不同且访问的数据源形式不太一样，比如使用`NewExample1`类型时，其数据源有本身可能更新的`var1`, 也有不变的部分比如`e1->varn`。这正是泛型编程可以发挥的场景，使用模板可以去掉大量的重复逻辑。

## 泛型编程
泛型编程是指使用一种独立于任何具体类型的方式进行编码，模板是泛型编程的基础。使用模板前需要搞清楚的是，模板的推导是编译期完成的，编译完成后就生成了对应类型的特化实现，并不是运行期动态特化。

所以模板函数实现一般放在头文件中，编译器在类型检查时，只有看到函数实现才能特化出具体类型的函数。如果模板函数声明和实现分开，会导致链接时找不到函数实现。

从上面的特性开发得知，特性分支需要同步主干代码，那么如果在特性分支上把模板函数实现都移入头文件，也会给同步造成很大的问题，也需要人工校对头文件的模板函数和cpp里的函数，最好的方式就是就地(cpp中)模板化。

### 在cpp中模板化
如何实现模板声明和实现的分离，在cpp文件中实现函数。检索通过`stackoverflow`找个了方案：在cpp中实现时，需要声明要特化的类型，这样在编译时就能根据特化声明来特化函数实现。当然这样就不是广义的泛型了，只支持声明特化的几种类型，详细内容看`stackoverflow`及其最佳答案里的链接。在这个特性中，这种方式满足当前的使用。示例如下：
```
# .h
# 模板类
template <class T>
class Example {
    void Func1(T& t);
    ...
};

# 模板函数
template <class T>
void ExampleFunc(T& t);

# .cpp
# 模板类实现
template <class T>
void Example<T>::Func1(T& t) {
    ...
}

## 明确类特化
template class Example<Example1>;
template class Example<NewExample1>;

# 模板函数实现
template <class T>
void ExampleFunc(T& t) {
    ...
}

# 明确函数特化
template void ExampleFunc<Example1>(T& t);
template void ExampleFunc<NewExample1>(T& t);
```
结合上述类型，我们特化了`Example1`和`NewExample1`两种实现，满足我们当前的使用需求。这样能消除大部分的重复逻辑，仅仅增加了两种特化声明。

### 类型差异处理
前文提到，因为我们两种类型仅仅是为了避免大量冗余只读的部分，我们有些逻辑获取数据源是和类型强关联的，直接上例子更直观：
```
# Example1类型处理
void Example::Func1(Example1& t) {
    return t.var1 + t.varn;
}

# NewExample1类型处理, 只读部分通过指针访问Example1
void Example::Func1(NewExample1& t) {
    return t.var1 + t.e1->varn;
}
```
可以看到，对于读写部分，两种类型的读取代码一摸一样，对于只读部分，就出现了差异。在不考虑复杂模板的情况下，想到的一种折中方法如下：
```
# 模板函数实现
template <class T>
void Example<T>::Func1(const Example1& t1, T& t2) {
    return t2.var1 + t1.varn;
}

# 全特化两种类型的实现，封装具体差异部分
template <>
void Example<Example1>::Func1(Example1& t) {
    return Func1(t, t);
}

template <>
void Example<NewExample1>::Func1(NewExample1& t) {
    return Func1(*t.e1, t);
}
```
只增加了函数调用的封装，屏蔽类型引起的差异。在消除重复代码的情况下，增加了一点函数封装的代码，当前也还可以接受。当然，这种方法，只适用于明确知道几种类型的情况下，如果泛化的类型比较多，就不是一种很好的方法了。

### 更好的方法？
那么，有没有更好的方法，可以直接在模板中处理类型带来的逻辑差异呢。是不是只能通过模板元编程来解决呢？还在研究中。。。

## 参考链接

[Templates - cppreference.com](https://en.cppreference.com/w/cpp/language/templates)

[Storing C++ template function definitions in a .CPP file](https://stackoverflow.com/questions/115703/storing-c-template-function-definitions-in-a-cpp-file)
