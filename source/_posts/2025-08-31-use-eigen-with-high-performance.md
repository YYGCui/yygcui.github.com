---
title: Eigen高性能使用
date: 2025-08-31 11:34:24
tags:
- 性能优化
- 智能驾驶
- Eigen
categories:
- 技术积累
comments: true
---
之所以写这个话题，是因为在实际工作中遇到了相关的问题，比如在定位coredump问题时发现是因为Eigen内存未对齐导致，比如在优化性能时发现有隐含的动态内存申请是因为使用动态矩阵导致... 基于上述实际问题，发现很多人只是会使用这个库，但是不知道怎么使用更高效，所以整理了以下规范。

{% blockquote https://eigen.tuxfamily.org/index.php?title=Main_Page %}
Eigen 是一个用于线性代数的 C++ 模板库：包括矩阵、向量、数值求解器以及相关算法。
{% endblockquote %}

## 一、头文包含要求

按需包含， 只包含需要的：
  ```cpp
  #include <Eigen/Core>
  #include <Eigen/Dense>
  #include <Eigen/Geometry>  // Quaternion, Transform
  ```

🚫 禁用 `using namespace Eigen`; 避免名称冲突


## 二、类型选择和初始化

### 优先选择固定大小矩阵：

| 向量/矩阵 | 类型推荐 |
| --- | ----------- |
| 2D/3D 向量 | `Eigen::Vector2f / Vector2d、Vector3f / Vector3d` |
| 小矩阵（<= 4x4） | `Matrix3f, Matrix4d` |
| 大矩阵（> 4x4） | `MatrixXf, MatrixXd`，但注意维度、性能 |

🚫 不推荐 Matrix<double, 3, 1>；推荐用 Vector3d，简洁可读性高。

### 初始化
```cpp
Eigen::Vector3d pos(1.0, 2.0, 3.0);
Eigen::Matrix3d rot = Eigen::Matrix3d::Identity();
```
用 setZero(), setIdentity() 初始化，不用手动循环清零。

使用 reserve() 和 conservativeResize() 时要小心，它们可能频繁触发 reallocation。

## 三、参数传递

| 目的 | 写法 | 推荐理由 |
| --- | --- | ----------- |
| 只读（传参） | const Eigen::Vector3d&  | 零拷贝，性能高 |
| 可接受表达式/子块 | const Eigen::Ref\<const Eigen::Vector3d\>&  | 通用接口适用 |
| 可修改 | Eigen::Vector3d&  | 允许函数修改值 |
| 可修改 + 表达式 | Eigen::Ref\<Eigen::Vector3d\>  | 修改临时块等复杂结构 |

🚫 不推荐值传参，多一次拷贝；推荐使用引用传参。

## 四、性能优化

### 1. 避免使用动态大小矩阵处理小维度矩阵
```cpp
// 不推荐
Eigen::MatrixXd A(3,3);
// 推荐
Eigen::Matrix3d A;
```
🚫 避免使用动态大小矩阵，动态大小矩阵，每次都会动态申请内存malloc/free

### 2. 避免临时物件
```cpp
// 不推荐：产生多个临时表达式
// C.inverse会产生临时矩阵，然后两个乘法分别产生临时矩阵
// auto 会产生动态矩阵，申请内存
auto result = A * B + C.inverse() * D;

// 推荐
Eigen::Matrix3d tmp = C.inverse() * D;
Eigen::Matrix3d result = A * B + tmp;
// 性能更好的写法
Eigen::Matrix3d result = C.inverse() * D;
result.noalias() += A * B;

```

🚫 避免使用auto， auto 默认使用动态大小矩阵，会动态申请内存

### 3. 利用表达式模板
**链式表达式**：合并操作以减少临时变量。

只要右侧表达式不涉及求逆`inverse()`、不重复使用左值变量，就采用合并写法，Eigen 内部优化，内存访问少

 ```cpp
  // 不推荐：多次内存分配，生成临时变量
  temp1 = A * B;
  temp2 = C * D;
  result = temp1 + temp2; 

  // 推荐：Eigen 合并计算
  result = A * B + C * D;
  ```
🚫 尽量不要人为拆分表达式，除非涉及求逆、堆叠等，可以换个更好的写法

 ```cpp
  result = result + A * B;  // 可能导致别名冲突和慢速路径
  result = result.eval() + A * B;  // 强制中间结果保存，避免问题
  result.noalias() += A * B; // 更高效
  ```
  
🚫 避免 .eval()，除非你真的想 materialize 结果  

### 4. 使用 `.noalias()` 防止多余内存拷贝
左值和右值没有混叠时可用，没有别名关系（如 C != A && C != B）

避免 Eigen 内部自动别名检测（runtime check），直接告诉它 C 与右侧没有共享内存；

编译时可以进一步优化，尤其在**大矩阵**计算中更明显。

```cpp
// 慢
C = A * B;
// 快
C.noalias() = A * B;
```

### 5. 避免直接反矩阵
矩阵求逆代价高、数值不稳定，建议替换为 solve() 系列，根据矩阵类型选择合适的求解器
```cpp
// 不推荐
x = A.inverse() * b;

// 推荐： A 必须是对称正定矩阵（否则 .ldlt() 会失败或者返回错误结果）
x = A.ldlt().solve(b);

// 通用矩阵
// 适用于 矩阵表达式，比如 Eigen::MatrixXd
Eigen::MatrixXd A(3, 3);
Eigen::VectorXd b(3);

Eigen::VectorXd x = A.partialPivLu().solve(b);

// 固定类型的写法
Eigen::Matrix3d A;
Eigen::Vector3d b;

Eigen::PartialPivLU<Eigen::Matrix3d> lu(A);
Eigen::Vector3d x = lu.solve(b);
 ```

**常见矩阵类型说明：**

| 方法 | 适用矩阵类型 | 相对速度 | 稳定性 | 特殊要求 | 适用规模 | 
| --- | --- |  --- |  --- |  --- | ------ |
| inverse() |  通用 |  基准 |  中等 |  无 | <= 100x100 | 
| LU  | 通用方阵  | 1.2x  | 高  | 可逆矩阵 | 100-1000 | 
| LDLT  | 对称矩阵 |  2.0x  | 高  | 对称 |  - | 
| LLT  | 对称正定  | 2.3x  | 很高  | 对称正定 | - | 


### 6. 数据映射与零拷贝
Eigen::Map：直接操作外部内存，避免复制。
```cpp
double data[16];
Eigen::Map<Eigen::Matrix4d> matrix(data);  // 映射数组为 4x4 矩阵
```

### 7. 逐元素操作优化
使用 .array() 或逐元素函数（如 .cwiseProduct()）。
```cpp
// 逐元素乘法
result = a.array() * b.array();
// 或使用 cwiseProduct
result = a.cwiseProduct(b);
```

### 8. 复合赋值运算符
优先使用 +=、-= 直接修改原变量。
```cpp
// 不推荐：临时变量、多余的内存拷贝
A = A + B * C 更高效  
// 推荐：表达式优化、复用内存
A += B * C;  
```

### 9. 并行化加速
Eigen 在进行一些矩阵运算（如大矩阵乘法、求逆、分解）时，会自动使用多线程加速。如果你不设置，Eigen 会默认尝试使用系统检测到的核心数。

```cpp
Eigen::setNbThreads(4);  // 设置线程数
```

可通过以下接口查询当前设置的线程数
```cpp
int threads = Eigen::nbThreads();  // 获取当前设置值
```
建议按需配置，避免线程过多抢占资源，需要测试线程数对性能的影响

## 五、带实体结构和 STL 字段

### 实体结构加对齐操作程序
```cpp
// struct/class，都需要对齐
struct Pose {
  EIGEN_MAKE_ALIGNED_OPERATOR_NEW
  Eigen::Vector3d position;
  Eigen::Quaterniond orientation;
};
```
固定尺寸对象：需内存对齐，应用`EIGEN_MAKE_ALIGNED_OPERATOR_NEW`，避免 SIMD 错误。否则在某些平台可能**崩溃**

### 应用 aligned allocator
```cpp
std::vector<Eigen::Vector3d, Eigen::aligned_allocator<Eigen::Vector3d>> points;
```

{% blockquote https://libeigen.gitlab.io/eigen/docs-3.3/group__TopicStructHavingEigenMembers.html Eigen 3.3.*版本 %}

Using STL containers on fixed-size vectorizable Eigen types, or classes having members of such types, requires taking the following two steps:
 
A 16-byte-aligned allocator must be used. Eigen does provide one ready for use: aligned_allocator.

If you want to use the std::vector container, you need to #include <Eigen/StdVector>.
{% endblockquote %}

Eigen 3.3 版本必须应用aligned_allocator，否则可能导致**崩溃**，如出现地址未对齐的 SIGSEGV 错误。

Eigen 3.4 版本文档说明在C++17，gcc 7/clang 5以上，由编译器搞定对齐问题: [EIGEN_MAKE_ALIGNED_OPERATOR_NEW说明](https://eigen.tuxfamily.org/dox/group__TopicStructHavingEigenMembers.html)；[aligned_allocator说明](https://eigen.tuxfamily.org/dox/group__TopicStlContainers.html)。

注意使用的版本，并按对应的策略实现。

*注：*
1. EIGEN_MAKE_ALIGNED_OPERATOR_NEW 会重载堆内存操作 new/delete , 使用 Eigen 的对齐分配器； 所以应用 EIGEN_MAKE_ALIGNED_OPERATOR_NEW 后， 该类(class/struct)自身new出来的Eigen::Vector3d 或者 std::vector<Eigen::Vector3d> 都保证了内存对齐。
2. 在 类(class/struct) 中，如果应用了 EIGEN_MAKE_ALIGNED_OPERATOR_NEW， 可以不需要再对 vector 指定 Eigen::aligned_allocator


## 六、显式类型转换
避免隐式转换：统一标量类型（如全用 double），或显式转换。
```cpp
Eigen::Vector2d vd(1.0, 2.0);
Eigen::Vector2f vf = vd.cast<float>();  // double -> float 显式转换
```
注意：.cast<>() 只转类型，不改维度

## 七、特殊情况

默认列优先：与 Fortran/MATLAB 兼容，但与其他库交互时注意顺序。

### 1. 如果需要行优先存储：
```cpp
Eigen::Matrix<float, 4, 4, Eigen::RowMajor> mat;
// 映射行优先数据
Eigen::Map<MatrixXd, 0, Stride<Dynamic, 1>> row_major_map(data, rows, cols);
```

### 2. 如需兼容 CUDA / OpenCV，也推荐 RowMajor

## 八、配套 CMake 编译选项

Eigen 默认会尝试为某些类型（如 Vector4f, Matrix<float, 4, 4> 等）做 SSE/AVX SIMD 对齐优化，提高计算效率。

但是如果你在 某些编译环境中 或使用 静态变量（static）/全局变量，而这些变量是 Eigen 类型的，就可能引发 alignment 问题（例如崩溃或未定义行为）

```cmake
add_definitions(-DEIGEN_DONT_ALIGN_STATICALLY=1)
```

这个宏只影响静态变量是否使用内存对齐。

它不会影响动态分配的 Eigen 对象（如 new Eigen::Vector3f()），这些是安全的。

如果你没有使用静态或全局变量，就 不要定义该宏，以便保留性能优化。

## 九、编译优化

### 1. 编译器选项：
通过开启编译选项优化性能：
- O3: 编译器会进行循环展开、函数内联、向量化等优化，通常能显著提升 Eigen 矩阵运算的性能。
- march: 开启 CPU 支持的 SIMD 指令集，从而提升 Eigen 内部向量化的效率。
- ffast-math:  放宽对 IEEE 754 浮点标准的严格遵守，允许编译器进行激进优化，提升矩阵运算和数值求解的速度。

GCC / Clang:
```cmake
# 这里示例是native, 建议使用具体架构，特别是交叉编译时，如x86_64, arm8.2
-O3 -march=native -ffast-math
```
注意：上述编译选项，有得有失，比如使用O3生成的代码会更大，编译时间更长，有时也可能触发编译器的 bug 或导致调试困难。一般建议用O2即可，除非性能尤其重要根据实际测试情况来定。

特别指出 Nvidia 智能驾驶芯片的march如下：
```cmake
    # arch set
    if ("${HARDWARE}" STREQUAL "orin")
        #cpu part 0xd42
        set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -march=armv8.2-a" -mtune=cortex-a78ae")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=armv8.2-a" -mtune=cortex-a78ae")
    elseif ("${HARDWARE}" STREQUAL "thor")
        #cpu part 0xd83
        set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -march=armv9-a" -mtune=neoverse-v3ae")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=armv9-a" -mtune=neoverse-v3ae")
    endif ()
```
注意：mtune参数用于更细节的架构描述，可能有些编译器版本不支持，可以删除掉。

### 2. 检查 SIMD 是否生效

CPU 支持的 SIMD 指令集是否生效，可以通过代码来校验。

```cpp
std::cout << Eigen::SimdInstructionSetsInUse() << std::endl;
```

## 参考链接
- [Eigen官方文档](https://eigen.tuxfamily.org/index.php?title=Main_Page)
- [ChatGPT 各种相关 prompt 的回答](https://chatgpt.com/)
