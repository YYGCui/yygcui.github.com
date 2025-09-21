---
title: 开发流程和质量
date: 2025-09-21 16:32:55
header-img: images/header/river-cloud3.jpg
tags:
- DevOps
- CI/CD
- QA
categories:
- 技术积累
comments: true
---

前面写了 智能驾驶 DevOps 总览，没有深入的探讨各个关键阶段，本文结合作者在智能驾驶行业的工作经验，着重探讨一下开发环节的流程以及开发质量。谈到开发流程，就不得不提汽车行业软件基本上相关厂商必须要同时掌握和实施的两大支柱：[ASPICE](https://zh.wikipedia.org/wiki/Automotive_SPICE) 和 [ISO 26262 (功能安全)](https://zh.wikipedia.org/wiki/ISO_26262)。

## ASPICE & ISO 26262

ASPICE 是用于评估和改进汽车软件开发过程的一套过程评估参考模型。它提供了一整套最佳实践，用于评估和改进汽车电子和软件开发过程的能力成熟度，保证汽车软件和电子系统开发过程的 可控性、可复用性、可验证性和安全性，最终提升软件的质量和可靠性。

ISO 26262 (功能安全) 是一个功能安全标准，即使系统在出现故障时，仍能保证不会引发不可接受的风险。它规定了汽车电子电气系统在整个生命周期（从概念、开发、生产、运维到报废）中需要遵循的安全相关活动和要求。

主要特性做一个总结如下：

| 特性 | **ASPICE** | **ISO 26262** |
| :--- | :--- | :--- |
| **核心焦点** | **过程能力**（How to build） | **功能安全**（What to build for safety） |
| **范围** | 所有汽车电子/软件项目 | 仅与安全相关的系统（Safety-related systems） |
| **性质** | **过程评估模型**（Guideline/Best Practice） | **功能安全标准**（Standard，含合规性要求） |
| **主要目的** | 过程改进、能力评估、保证质量 | 风险管控、安全保证、合规认证 |
| **等级概念** | **能力等级**（Capability Level 0-5） | **安全等级**（ASIL A/B/C/D） |
| **强制性** | 通常由客户合同要求，非法律强制 | 虽非法律，但是行业准入门槛，具有**准强制性** |

ASPICE 和 ISO 26262 的总览图如下，两者都使用 V 模型来组织开发流程、嵌入安全活动。V 模型（V-Model）是一种经典的开发流程模型，是在软件开发过程中以测试阶段与开发阶段对应关系为特征的模型，它的核心思想是开发的每个阶段，都要有相应的验证与确认活动来保证质量。

<img width="636" height="514" alt="automotive-spice-v-model-overview" src="/images/dpqa/automotive-spice-v-model-overview.png" />

<div style="text-align: center;">

图片来源: [《ASPICE V 模型概述》](https://spyro-soft.com/blog/automotive/aspice-101-a-guide-to-automotive-spice)

</div>

<img width="636" height="508" alt="iso-26262-v-model-overview" src="/images/dpqa/iso-26262-v-model-overview.png" />

<div style="text-align: center;">

图片来源: [《ISO 26262 系列标准概述》](https://www.iso.org/obp/ui/fr/#iso:std:iso:26262:-11:ed-1:v1:en)

</div>

ASPICE 从 SWE.1 到 SWE.5 和 ISO 26262 从 6-5 到 6-11 的描述是一脉相承的，从需求、设计、实现到验证、集成、测试。它们所表达的核心本质概括一下就两点：**双向可追溯，过程可监控**。达成这两点就能保证开发过程可控，开发出来的产品安全，进而达成甲方的要求或者认证的需求。实现这两点离不开标准化的流程和规范化的操作，以及按标准和规范执行的质量监督。

## 标准化 & 规范化

为达成 ASPICE 和 ISO 26262 的落地实施，我们需要一套标准化的流程，规范化的指导帮助所有参与者的执行和输出一致。开发流程一般由质量部或者相关团队根据公司的需求来设计，大致框架都差不多，为了后续方便描述，以一个迭代过程设计了一个开发流程示例。

<img width="636" height="342" alt="dev-process-example" src="/images/dpqa/development-process-example.png" />

### 计划阶段
- 输入：产品项目计划
- 活动：迭代计划，迭代范围圈定
- 输出：迭代计划表，迭代交付项列表
- 工具：Confluence 或 专用/自研项目管理工具
- 责任：PM

### 需求阶段
- 输入：产品需求
- 活动：需求转化，评审，文档化，串讲
- 输出：系统需求，设计需求，分配需求，需求规格说明书，纪要
- 工具：JIRA, Confluence 或 专用/自研项目需求管理工具
- 责任：SE, MDE

### 设计阶段
- 输入：系统需求，设计需求
- 活动：系统设计，架构设计，用例设计，文档化，串讲
- 输出：设计文档，设计需求，需求规格说明书
- 工具：JIRA, Confluence, draw.io 或 专用/自研设计工具
- 责任：SE, MDE, TSE

### 开发阶段
- 输入：分配需求，编码规范，Git策略，开发工具链
- 活动：详细设计，代码实现，单元验证，用例开发
- 输出：设计文档，代码，单元验证报告
- 工具：JIRA, Confluence, Gitlab, gtest/vectorcast, sonarqube/coverity等
- 责任：MDE, SWE, TE

### 测试阶段
- 输入：软件包，测试用例
- 活动：集成测试，功能测试
- 输出：测试报告
- 工具：JIRA, Confluence, Python 或 自研测试平台
- 责任：TE

### 发布阶段
- 输入：软件包，交付项列表，报告
- 活动：评审软件合格性
- 输出：评审结论
- 工具：Confluence 或 专用/自研项目需求管理工具
- 责任：PM, QA

QA 是流程的制定者，流程落地的审核者。上述只写了发布阶段的评审，实际上每个阶段都有准出标准。QA 在迭代过程中，根据各阶段的输出评审是否达成标准以及标准是否合理，不断优化流程，达成提高迭代效率和提高版本质量的双收益。

其他角色是流程的执行者，有没有真实的执行，是否达成准出标准，通过质量审计来评判，最直观的评判指标就是版本质量(版本问题，客诉等)。

## 开发工具链

开发阶段是涉及工具链最复杂的一个阶段，我们稍微展开以下。

### 编程规范

[Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html): 是 Google 公司制定的 C++ 编程规范，旨在规范代码编写风格，是 C++ 开发者们普遍认可并参考的业界标准之一，编程风格没有好坏，关键是要统一，有利于提高代码的可读性、可维护性和团队协作效率。

检查工具：SonarQube及其开源工具集，如 [Clang-tidy](https://clang.llvm.org/extra/clang-tidy/)

### 安全规范

[MISRA C++ Guidelines](https://misra.org.uk/): 是一套为在关键系统中编写安全、可靠的C++代码而制定的指导原则，主要目的是为了避免语言中可能导致不确定行为的特性，从而提高软件的安全性、可靠性，降低缺陷和漏洞的风险。

检查工具：Coverity，Parasoft 等，这一类主要靠商用工具，开源工具比较薄弱。

### 架构度量

从代码实现相关指标来度量软件架构，这是一个直接粗暴的度量方法，可以从圈复杂度，类定义代码行数，类实现代码行数，重复代码率，方法调用数，方法被调用数等等指标从模块，类，函数等各个维度做一些度量统计。架构度量没有统一的标准和完善的自动化工具，评审也是一个常用的方法。

检查工具：SonarQube 等

### 安全编译

[GCC 安全编译选项](https://blog.csdn.net/pwl999/article/details/111035160): 操作系统提供了许多安全机制来尝试降低或阻止缓冲区溢出攻击带来的安全风险。这些机制包含随机化程序内存布局、禁止在数据区域执行代码、在栈上添加特殊值检测覆盖、限制数据区域写入权限、在编译时插入边界检查以及编译告警转Error。

检查工具：gcc 编译选项配置

### 单元测试

单元测试是对软件中最小的可测试代码单元（如函数、方法或类）进行验证的测试活动。它由开发人员编写，旨在确保每个代码单元都能按照预期正常运行，并在编写代码时或之后进行，以发现和隔离代码中的错误。单元测试强调代码的逻辑正确性，并通过使用测试桩程序（如Stubs和Mocks）来隔离外部依赖。

检查工具：对于 ASIL B 及以下的安全等级，一般满足语句、分支覆盖即可，使用开源工具 [Googletest](https://github.com/google/googletest) 是一个高效选择；对于 ASIL D 安全等级，推荐商用工具 VectorCAST、 Parasoft，工具本身通过功能安全认证，支持 MC/DC 覆盖。

### Git 提交规范

git commit message 应该清晰明了，说明本次提交的目的，具体做了什么操作。约定好统一的格式和书写语言。在提交到远端时，将同一类 commit 合并成一个，非必要不增加新的 commit。

- 使用 Gerrit 平台时，推荐约定好 commit message 模板，体现修改的类型，修改内容，对应的需求或者问题单，以单一 commit 提交评审合入。
- 使用 Gitlab 平台时，推荐简化 commit message，体现修改内容即可，约定好 Gitlab MR 模板，体现修改的类型，修改内容，对应的需求或者问题单，乃至实现方案，计划合入版本等信息辅助合入评审。

检查工具：Git hook .commit-msg, Gitlab .gitlab/merge_request_templates/Default.md, 通过 pipeline 校验有效性


上述工具链，通过 CI 集成到 pipeline 中按 Git commit 或者 MR 自动化检查。

## 双向可追溯，过程可监控

### 可追溯
双向追溯不仅可以向前追溯，即从需求到实现到测试的过程；也可以向后追溯，即从测试回溯到实现回溯到需求。这种机制的核心目的是确保软件开发过程中的每个部分都与其相关的需求和目标保持一致。

### 可监控
可监控是指某个过程不是“黑箱操作”，而是有手段去跟踪、测量、检查、反馈，能确保过程按照预期运行。这要求过程中有数据、有指标、有反馈，核心目的是能实时发现问题并确保过程可控。

追溯过程和相关数据指标如图，通过数字化平台自动分析统计：

<img width="636" height="328" alt="trace-monitor" src="/images/dpqa/process-trace-and-monitor.png" />

最后总结一下，开发流程要符合现状，不要太理想化；质量要客观中立，不要偏向任何一方。
