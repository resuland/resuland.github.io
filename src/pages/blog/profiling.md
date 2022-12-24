---
layout: '../../layouts/BlogPost.astro'
title: 'Accurate Profiling in the Presence of Dynamic Compilation'
description: 'Paper analysis'
pubDate: 'Dec 24 2022'
heroImage: ''
tags:
  - compilers
  - programming languages
  - optimization
  - virtual machines
---

## Abstract

- many **profilers** based on **bytecode instrumentation** yield **wrong results** in the presence of an **optimizing dynamic compiler**
  - **not being aware** of optimizations such as stack alloocation of method inlining
  - due to the **inserted code disrupting** such optimization (**perturbation**)
- the authors introduce a **novel technique** to make any **bytecode level profiler aware of optimizations performed by the dynamic compiler**
- the authors implement it in a state-of-the-art Java VM and demonstrate its significance with concrete profilers
- quantify the impact of
  - **escape analysis** on allocating profiling
  - **objects lifetime** analysis
  - **method inlining** on callsite profiling
- new approach that enables **new kinds of profilers** (e.g. profiler for non-inlined callsitess)
- **testing framework** for locating **performance bugs** in dynamic compiler implementations

---

## Introduction

- many programming languages (e.g. Java, C#) are implemented on top of a **managed runtime** system featuring an **optimizing dynamic JIT compiler**
  - programs are first **interpreted** (compiled by a **baseline compiler**)
  - **frequently executed** methods are later **compiled** by the **optimizing dynamic compiler**
- **State-of-the-art dynamic compilers** apply **online feedback-directed optimizations** to the program according to **profiling information** gathered during **program execution**
  - **inlining**: method invocations are removed
  - **stack allocation based on (P)EA**: heap allocations are removed reducing the pressure on the garbage collector

---

- many profiling tools are implemented using **bytecode instrumentation techniques** (**inserting profiliing code into programs at the bytecode level**)
- such profilers are not aware of the optimizations performed by the **dynamic compiler** because it is **trasparent** to the **instrumented program**
- such profilers suffer from 2 serious **limitations**:
  - **over-profiling** of code that is **optimized** (or removed) by the **dynamic compiler**
  - **perturbation** of the **compiler optimizations** due to the **inserted instrumented code**

---

- on the other hand, code **instrumented by a profiler may affect the optimization decisions of the dynamic compiler** (the presence of profiling makes the profiled program behave differently):
  - the **increased size** of an **instrumented method** may **prevent its inlining** into callers
  - **passing a reference** of an application object to the **profiling logic** makes the object **escape** and therefore **forces heap allocation**
- in general, when profiling a program, the **observer effect** (**perturbation of low-level dynamic metrics**) **cannot be avoided**
- using **bytecode instrumentation** it is **generally impossible to profile the effectiveness of dynamic compiler optimizations**

---

### Contributions

- the new technique enables profilers which collect **dynamic metrics** that:
  1. **correspond to an execution of the base program without profiling** (w.r.t. the applied compiler optimizations)
  2. properly **reflect the impact of dynamic compiler optimizations**

1. make profilers **aware of dynamic compiler optimizations** and **avoid perturbation of the optimizations**
   - implementation in the **Oracle's Graal compiler**
   - provide a **set of query intrinsics** for **retrieving the optimization decisions within inserted profiling code**
2. present profilers to explore the impact of
   - **partial escape analysis** and **stack allocation** on **heap usage**
   - **object lifetime**
   - **method inling** on **callsite profiling**
3. present tools to **identify inlining oppportunities** and to study the impact of **method inlining considering varying levels of calling context**
4. introduce a **new framework for testing** the results of **dynamic compiler optimizations at runtime** (already helped in locating and fixing several performance bugs in **Graal**)

---

## Background

### Dynamic compilation

- 2 major **advantages** upon static compilation:
  - allows for a **platform-independent code representation** (e.g. Java Bytecode)
  - in some cases, the generated code may **outperform statically compiled code**, because the dynamic compiler can optimize aggressively by making certain assumptions on the future program behavior based of profiling information collected in the preceding execution
    - when assumptions fail, the **managed runtime system** switches back to **executing unoptimized code** (that may get optimized and compiled again)

---

- some optimizations:
  - **EA** analyzes **where references to objects flow** in order to determine their **dynamic scope**
  - **PEA** extends traditional **EA** by checking whether an **object escapes for individual branches** (allow postponing heap allocation until an object escapes)
  - **online feedback-directed** optimizations such as **profile-directed inlining of virtual call sites**
    - the managed **runtime** system **profiles** the **receiver type of virtual call sites** (**type feedback**) and **inlines such a call site**, preserving the **expensive dynamic dispatch** for **few** receiver types
    - if an **unexpected receiver type** is encountered at **runtime**, a **deoptimization** occurs

---

### Intermediate representation (IR)

- **IR graphs** are well suited for implementing compiler optimizations as **graph transformations** before emitting machine code
- usually dynamic compilers uses **different levels of IR**:
  - **high-level IR**: general optimizations
  - **low-level IR**: managed runtime-specific optimizations
  - **machine-specific IR**: machine-specific optimizations
- additional forms of **IR** are used for speeding up **local and global compiler optimizations**
- **Program Dependence Graph (PDG)**:
  - combines both **control-flow** and **data dependencies** to express **program semantics**
- the dynamic compiler **must ensure a valid schedule for the IR graph** (serialization of the graph)
- the **IR graph must not** contain any **data dependency edge** where a node **is not reachable**
- `Phi` nodes represents $\phi$-functions:
  - have multiple input data values and output a single selected data value according to the control-flow

---

### Instrumentation

- commonly used to **observe the runtime behavior of a program**
- in a **managed runtime system** that applies **feedback-directed optimization**, the dynamic compiler may **automatically instrument the compiled code**
- widely used for **implementing dynamic analysis** such as for **tracing**, **debugging** or **profiling**
- the inserted instrumentation code **emits some events** which may simpy be **dumped** or **consumed** by an **analysis** at **runtime**
- can target either **pre-compilation** (i.e. source code or bytecode) or **post-compilation** (i.e. machine code) program representation
  - instrumenting the **former** representation ofter **impairs accuracy of an analysis**
  - instrumenting the **latter** reprensetation makes it difficult to **map low-level events** (e.g. memory access) **to higher-level events** at the level of the user programming language (e.g. field access)

---

- a solution is to **perform instrumentation directly within the dynamic compiler** but this **requires deep knowledge of the dynamic compiler's implementation and of the IR it uses**
  - also in this case, the instrumentation code **may still perturb** the subsequent compiler phases

---

## Approach

- the **problems** with **over-profiling** and **perturbation** of optimizations are due to:
  - the **inability** of the dynamic compiler to **distinguish between the inserter profiling/analysis code and the base program code**
  - the **inability** of the inserted code to **adapt to the optimizations performed by the dynamic compiler**
- the key idea is to **make the compiler aware of the 2 kinds of code and treat them differently**:
  - base program code: apply optimizations as usual
  - inserted code: preserve its purpose and semantics by adapting to response to the optimization performed

---

## Running example

![figure1](/blog/profiling/figures/figure-1.png)

- **(a)**
  - the code allocates an instance of class `A`
  - only `if` a condition evaluates to `true`, invokes `foo()` on the newly allocated object
- **(b)**
  - high-level IR, optimized before lowering
- **(c)**
  - code reordering (while preserving its semantics)
  - **PEA** determines that the aloocation only escapes in the `then`-branch of the conditional, so the compiler moves there the allocation
- **(d)**
  - (pseudo-)code instrumentation section used to trace object allocations
- **(e)**
  - every allocation will be followed by an invocation of the `EmitAllocEvent()` method with the newly allocated object as an argument

---

- when optimizing, the newly allocated object **always escapes** into the **event-emitting method** (assuming it is **not inlined**) and so will be **always allocated on the heap** (even if the conditional evaluates to `false`) (**perturbation**)
- we would want the compiler to perform the optimizations as if the program was not instrumented
- we also want to preserve the intent of the instrumentation, so the `EmitAllocEvent` method has to follow the movement of the allocation into the `then`-branch of the conditional

---

## Algorithm overview

- approach formulated for a **method-based dynamic compiler** using a **graph-based IR** in **Static Single Assignment (SSA) form** with optimizations implemented as **graph transformations**

---

### High level procedure description

1. the **dynamic compiler** **builds the IR** of the **method** being **compiled**
2. the **procedure** identifies the **boundaries** between the **base program code** and the **inserted code**
3. the **procedure** **unlinks the inserted code** from the **base program IR**, creating inserted **code subgraphs** (**ICGs**) **associated** with **base program nodes**
4. the **dynamic compiler** **optimizes the base program IR** and **tracks** the executed **operations** on the **IR graph nodes**
5. if the compiler performs an **operation on a node** **with an associated ICG**, the **procedure** performs a **reconciling operation** on the corresponding ICG to preserve its sematics throught the trasformations
6. when the compiler finishes optimizing the base program IR, the **procedure** splice the **ICGs** back into it before lowering it to machine-code level

---

- to **ensure** that the **semantics** of the **base program** is not **changed** by the inserted code, the **ICG** must satisfy the following **properties**:
  - it must have **exactly** 1 **entry** and 1 **exit**
  - it must have **exactly** 1 **precedessor** and 1 **successor** **before** being **extracted** from the **IR**
  - it must **not** have **any outgoing data-flow edges into the base program IR** (the base program code must not depend on any values produces within an **ICG**)

---

- let's consider **data-flow edges** originating in the base program and targeting **ICGs** to be **weak data-flow edges**
  - these edges are **location-dependent**, so they **could prevent optimizations involving code motion**
  - these edges will be ignored by the dynamic compiler working on the base program IR but considered when performing the reconciling operations on the **ICGs**
  - after splicing the **ICGs** back into the base program IR, these **weak data-flow edges** will resume their normal semantics

---

## Extracting ICGs

![table1](/blog/profiling/tables/table-1.png)

- to distinguish between the base program code and the inserted code, the inserted code is **enclosed between invocations of a pair of boundary methods from the delimitation API**
- invocations of these methods can be **recognized at the IR level** and consequently used to **indentify the ICG boundaries**
- an ICG can be associated either with the **predecessor** or the **successor base program node**, or **anchor** to its **original location** in the **control flow graph** (**CFG**)
  - this is achived by passing this **information** as an **argument** to the invocation of the `instrumentationBegin()` method (dynamically impossible)
  - when `HERE` is passed as the argument, we create a **placeholder node** inserted in place of the ICG and associate the **ICG** with the **placeholder** (the compiler is modified to ignore placeholders)

---

### ICGs extraction algorithm

![figure2](/blog/profiling/figures/figure-2.png)
![algorithm1](/blog/profiling/algorithms/algorithm-1.png)

- it employs the **data structures** defined in **Figure 2**
- **Lines 5-9** for each node $b_I$ corresponding to an invocation of `instrumentationBegin()`, it collects all IR nodes, until encounters a node corresponding to an invocation of `instrumentationEnd()`
- **Lines 10-14** adds to the set of ICG nodes also nodes tha represent data values used exlusively within the ICG (not involved in any control flow and only involved in the data-flow among existing ICG nodes)
- **Lines 15-17** with the identified set of ICG nodes, collects the control-flow edges, data-flow edges and weak data-flow edige between ICG nodes into their respective sets
- **Lines 18-36** removes ICG nodes and edges from the base program IR graph
  - to preserve a valid CFG, reconnects the predecessor and successor nodes of the ICG, either directly **Lines 21-28** or via a placeholder node created for an ICG **Lines 29-34**
- **Line 37** adds a tuple representing an ICG into a set of ICGs

![figure3](/blog/profiling/figures/figure-3.png)

- **(a)**:
  - the original instrumentation code from **Figure 1d** is now surrounded by invocations of the **delimitation API methods**
- **(b)**:
  - in contrast to **Figure 1e** the **IR graph** now shows the **instrumentation as an ICG** associated with the **allocation node preceding** the ICG in the base program IR

---

## Reconciling operations on ICGs

- the optimizations performed by the dynamic compiler can be expressed as **IR graph transformations** which can be **split** into **simpler graph-mutating operations**
- to **preserve** the **purpose** of the **inserted code** residing in **ICGs** **associated** with the **base program IR nodes**, the procedure performs **reconciling operations** on the **ICGs** in response to **graph operations** performed on the base program IR

### ICGs extraction algorithm

![algorithm2](/blog/profiling/algorithms/algorithm-2.png)

- **Node elimination - Lines 3-4**
  - removes a node from the IR graph
  - primarily used to eliminate dead code
  - reconciliation operation: remove the associated ICG
- **Value node replacement - Lines 5-7**
  - replaces the origin node in a data-flow edge with another node
  - many optimizations: e.g. constant folding
  - reconciliation operation: update all affected weak data-flow edges in all ICGs to use the replacement node as the new source of a value
- **Node expansion - Lines 8-17**
  - expands a node into a subgraph which replaces the original node in the CFG
  - typically used to implement IR lowering and often followed by a value node replace operation
  - reconciling operation: re-associated the ICGs with either the entry or the exit node of the subgraph replacing the original node
- **Node cloning - Lines 18-25**
  - duplicates an IR node, the newly created node is usually moved to a different location in the CFG and the original node is sometimes eliminated
  - often used in transformations implementing e.g. loop peeling, loop unrolling or tail duplication
  - reconciling operation: close the associated ICG and attach it to the newly created IR node
- **Node movement**
  - relocates a node to a different location in the CFG
  - usually follows a cloning operation because the clone needs to be moved to a new location
  - it can be used as a standalone operation to implement e.g. loop-invariant code motion
  - reconciling operation: none, does not affect the replative position between the moved IR node and the associated ICG (implicitly "follows" the associated IR node around)

![figure4](/blog/profiling/figures/figure-4.png)

- **(a)**
  - from **Figure 3b**, let's assume as a result of **PEA** (which diregards the ICG), the dynamic compiler decides to move the allocation into the `then`-branch of the conditional
  - let's perform this transformation:
    1. the compiler first clones the allocation node
    2. this operation triggers a reconciling operation resulting in the cloning of the associated ICG
    3. this also involves updating all the IR edges to use the newly created allocation node
    4. the compiler moves the cloned IR node to the new location in the `then`-branch
    5. it eliminates the original allocation node
    6. this triggers the elimination of the original ICG

---

## Querying compiler decisions

![table2](/blog/profiling/tables/table-2.png)

- allow inserted code to **query** and **adapt** to the **dynamic compiler's decisions**
- the **queries** are represented by **invocations** of **special methods** that are **recognized** and **handled** by the **compiler** similarly to **intrinsics**

---

- **Query intrinsics**:
  - special methods that **expand** to an **IR subgraph comprising 1 ore more IR nodes** (while **compiler intrinsics** expand to a **sequence of machine code instructions**)
- **Static Query intrinsics**:
  - **expand** to **constant value nodes**, which **reflect static (compile-time) decisions of the dynamic compiler**
  - e.g. the name of the compiled root method, whether a method is compiled, etc...
  - usually used to **limit the profiling scope**
  - allows collecting **metrics** (e.g. execution of compiled methods)
- **Dynamic Query intrinsics**:
  - expand to $\phi$**-function nodes**
  - depending on which runtime path is taken during program execution, the $\phi$**-function node** selects a **distinct constant value representing the path**
  - useful when a compiler **expands** a **base program IR-node** into a **subgraph containing multiple code paths** that are **selected at runtime**
    - the **inserted code** can **query** whether an object was **allocated** in a **thread-local allocation buffer** (**TLAB**) of directly on the **heap** and consequently **select a type of lock**

---

## Splicing ICGs

- towards the **end** of the **dynamic compilation**, the following procedure **splice the ICGs back into the base program IR**

![algorithm3](/blog/profiling/algorithms/algorithm-3.png)

- **Lines 3-10**
  - for each ICG, it first evaluate all query intrinsics and replaces the corresponding nodes with the resulting IR subgraph
- **Lines 12-14**
  - removes the invocations of the delimitation API methods
    - splices the ICG into the base program IR graph
  - depending on the constant argument passed to the `instrumentationBegin()` method which is either `PRED`, `SUCC` or `HERE` inserts the ICG:
  - **Lines 15-19** after the associated node
  - **Lines 20-24** before the associated node
  - **Lines 25-31** in place of the associated placeholder node
- **Lines 32-39**
  - converts the weak data-flow edges back to normal data-flow edges
- **Lines 36-39**
  - if the originating node for a weak data-flow edge is not available in the resulting IR graph, it will be replaced with a default value correspoding to its type

![figure4](/blog/profiling/figures/figure-4.png)

- **(b)**
  - the figure shows the result of splicing the ICGs back into the base program IR with the invocation of the `EmitAllocEvent()` method relocated to the `then`-branch of the conditional

---

## Improving existing tools

- **improve existing profilers and tools based on bytecode instrumentation**
- this approach allows improving these tools by **enabling observation of program execution at the level of compiled code** (still using bytecode instrumentation) and by **avoiding optimization perturbations arising** from icreased method sizes due to the inserted instrumentation code

---

## Impact on allocation profiling

- **allocation profiling** is generally used to **identify allocation hotspots** because these may be **associated** with **high garbage collection overheads**
- commonly used profilers **generate over-profiling and perturbations**
- an allocation hotspot profiler may draw **attention** to **places** with **high allocation rates** which in reality may have only a negligible impact of the **GC overhead**

---

- the authors developed an allocation profiler which uses bytecode instrumentation to track object allocations

![figure5](/blog/profiling/figures/figure-5.png)

- it uses the **delimitation API** to make itself **visible** to the **dynamic compiler**
- it uses 2 instrumentation blocks:
  - one associated with the **allocation** and executed only when an actual allocation occurs that makes use of the `isMethodCompiled()` intrinsic to distinguish between interpreted-mode and compiled-mode allocation
  - one **anchored** to the place where the allocation occurs at bytecode level

---

### Benchmark

- the authors report on **stack allocations** calculated as the **difference** between:
  - **bytecode-level** allocations (counted via `EmitBytecodeAllocEvent()`)
  - and **actual** allocations (counted via `EmitHeapAllocEvent()` and `EmitInterpreterAllocEvent()`)

---

- profile on selected **benchmarks** from the **DaCapo suite** on a multi-core platform and report results for the **1st** (**startup**, **unoptimized**) and **15th** (**steady** state, **optimized**) **iteration**

![figure6](/blog/profiling/figures/figure-6.png)
![table3](/blog/profiling/tables/table-3.png)

- the overprofiling percentage generally tends to be **lower** for the amount of allocated memory (weighted by **allocated object sizes**) compared to the number of allocations
- both the number of stack allocations and the amount of memory allocated on the stack **potentially affect the ranking of the allocation hotsposts** in the **resulting profile**

---

## Impact on object lifetime analysis

- another **application** of **allocation profiling** is to **collect information on memory-related behavior of programs** which helps in **GC algorithm design and development**
- usually dynamic analysis tools such as **ElephantTracks** (an implementation of the **Merlin algorithm**) generate **over-profiling and perturbations** (better than brute-force bulk-mode heap erase)

---

- to quantify the impact of these **observer effects** on the **object lifetimes**, the authors **profiled** the same set of **DaCapo benchmarks** using an **implementation** of the **Merlin algorithm**
- they developed 2 different **variants** of the **instrumentation** necessary to **track**:
  - **object allocation**
  - **object usage**
  - **reference update**

1. the **first variant**, which represents the **baseline**, is a **standard instrumentation** in which the **inserted code** for tracking object allocations and object** usage always emits all events** and **passes all object references to the profiler**
2. the **second variant** takes advantage of the new approach and **explicitly marks the instrumentation code using the delimitation API**

---

- when **tracking** the target of an **object-related operation**, the instrumentation will receive an **actual reference** if an object is **heap-allocated** or `null` if it is **stack-allocated**
- usage of an **atomic local clock** represented by the **cumulative amount of allocated memory**

![figure7](/blog/profiling/figures/figure-7.png)

---

## Impact on callsite profiling

- dynamic compilers in modern VM implementations **aggressively inline methods at hot call sites** to **eliminate the method invocation overhead**, to **expand the scope for other intraprocedural optimizations** and to **enable specialization of the inlined code**
- at **polymorphic callsites** the **target method** is determined by the **receiver type** and usually requires **dynamic dispatch**, which hinders inlining
- yet with a classic instrumentation-based callsite profiler it is **impossible** to **distinguish** between an **inlined** and a **non-inlined callsite** because the inlining behavior is **not observable** at the **bytecode level**
- bytecode instrumentation **has a tendency to disturb inlining** because inserted code **increases methods sizes** (perturbation and loss of accuracy)

---

- the authors developed a **new callsite profiler** using **bytecode instrumentation**
  - the instrumentation code is **associated with call site** and will **emit an eventonly when a callsite is not inlined**
- to **evaluate** the potential **loss of accuracy** caused by perturbing the inlining optimization, the authors used 2 **variants of the dynamic compilers**:
  - **perturbed**: where instrumentation influences inlining decisions
  - **accurate**: disregards the size of the inserted code (following the new approach)

---

- **DaCapo benchmarks**, **15 iterations** (like before)
- the following table reports the results for the **15th iteration** (**steady state**)

![table4](/blog/profiling/tables/table-4.png)

- the **perturbed** callsite profiler **overprofiles** 92.65% of the method calls (4.86% **more than the accurate version**)
- by **combining accurate callsite profiling with calling context profiling**, the new approach also enables **accurate stack depth profiling** (commonly found metric in workload characterization research)

---

## Enabling new tools

- 3 additional case of study
  1. use of the **callsite profiler** to **identify** the causes for **not inlining potentially hot callsites**
  2. use of a **calling-context-aware receiver-type profiler** to explore the potential **benefits** of using **calling context information** to **resolve target methods at non-inlined polymorphic callsites**
  3. present a **complier testing framework** relying on the **ability to observe program behavior** at the level of **compiled code**

---

## Identifying inlining opportunities

- **logging** for **inlining decisions** usually includes:
  - the **inlining decision** for each compiled call site
  - along with **reasons** for **not inlining** specific **call sites**
- the log can be used to identify **additional optimization opportunities**
- the logs produced by existing VMs **do not help in deciding** whether the reasons for not inlining a particular call site are worth analyzing because **there is not enough additional information** (e.g. hotness) **related to a particular call site** and also because logs** may contain duplicate entries** for methods that were inlined from **different root methods or recompiled**

---

- the authors **complemented** the log with the **information about hotness** of the **non-inlined call sites** (from callsite profiling)
- they **filtered** the resulting **augmented inlining log** looking for **inlining opportunities at polymorphic call sites**
- for each **benchmark**, they **identified** the **hottest call site that was not inlined due to polymorphism-related reasons** (Table 5)

![table5](/blog/profiling/tables/table-5.png)

- in general, the reason for not inlining these call sites is that they **target too many types**
  - **reason #1 (no methods remaining after filtering less frequent methods**
    - the number of receiver types exceeds a preset limit (configurable)
    - the frequency of the profiled types is below a preset threshold
  - **reason #2 (relevance-based)**
    - the compiler wanted to inline 1 or more targets, but the total size of these targets is over a certain limit

---

- in general, an **observed phenomenon** is that a call site may have **different distributions of dynamic receiver typesin different calling contexts**
- because the receiver-type profiling in **interpreted mode lacks calling-context information**, the **negative inlining-decision results** are based on **information from all calling contexts**
- **Hypothesis**: maybe **including calling context in receiver-type profiling may help in resolving the receiver type for some of the non-inlined call sites**

---

## Calling-context aware receiver-type profiler

- to test the **Hypothesis**, the authors **extended** the **previous non-inlined callsite profiler** to **combine** **existing calling-context profiling with a receiver-type profiling**
- with each non-inlined call site, the profiler **associates a receiver type profile for each of 0, 1, 2, and 3 levels of calling context**
  - therefore it produces a **distribution** of **dynamic receiver types for each non-inlined call site and calling-context level** (with **level 0** = **no calling-context information**, representing the **baseline**)

---

- collection of **context-sensitive receiver-type profiles** for the selected **DaCapo benchmarks**
- for each **call site**, is determined whether it is **possible** to **resolve** the **receiver** to a **single type using the additional calling-context information**
- then the number of invocations that **could be resolved while considering 1, 2 and 3 levels of calling context** at each site is calculated

![figure8](/blog/profiling/figures/figure-8.png)

---

## Compiler testing framework

- when developing a dynamic compiler, the **various optimizations operating at the IR level are perfect candidates for unit testing** (ensure that correct code is always produced)
- the developers should be also able to **test whether the expected synergy between optimizations actually occurs** (tests difficult to write at the IR level)
- is **easier to test** the synergy between optimizations **by executing the compiled code and checking if it produces an expected output** (**currently** this approach is only able to **detect incorrect results**)

---

- the authors built a **testing framework to simplify testing of compiler optimizations and the combinations thereof**
- allow developers to **specify** the **test input** and the **expected results using normal** (Java) **code** instead of having to craft instances of the post-optimization IR

![figure9](/blog/profiling/figures/figure-9.png)

- **input**:
  - **target code**:
    - normally compiled and executed
  - **test case**:
    - simple tests:
      - use the methods of the compiler decision query API directly
      - assertion-based results
    - complex tests:
      - use of a profiler (specialized dynamic analysis focused at a specific location)
      - the profiler will instrument the target code automatically when it is loaded in the JVM
      - the test case triggers the execution of the target code and captures the expected results in the form of assertions
      - assertion-based within-range results
  - **(optional) profiler code**
- **phases**:
  - **warmup**:
    - the target code executes in the interpreted mode
    - collect internal profile information needed by the dynamic compiler
    - when the target code is compiled, a trigger in the target code switches the test execution into profiling phase
  - **profiling**:
    - exercises the optimized target code and collects information on the decisions made by the dynamic compiler
    - may exercise more than 1 code path (e.g. using a random number generator)
  - **validation**:
    - the results from the actual profile are compared with the expected values to determine the test result (probabilities in case of a probabilitistic test)

---

- built as an abstract base test class on top of JUnit
- **test setup**: the framework triggers the execution of the **warmup** operation
  - target code is **loaded** by the JVM
  - if a profiler is used the code is **automatically instrumented**
  - the target methods use the `isMethodCompiled()` **intrinsics** as a guard to **avoid profiling the target methods during interpreted execution**
- if **no more warmup** is needed, the execution progresses to the **profiling** phase for a **fixed number of target method invocations**
- then advances to the **validation** phase which **checks the results**
- the code of both **profiling** and the **validation phases** is located in a single **test method** identified by the `@Test` **annotation**

---

![figure10](/blog/profiling/figures/figure-10.png)

- **Lines 1-16**: dynamic compiler test cases
- **Lines 18-45**: the actual test case
- **Lines 47-65**: the target code with inlined profiling code surrounded by invocations of delimitation API methods **Lines 52-56** which can be delegated to a dedicated profiler

---

## Discussion

- **benefits** and **limitations** about the new approach:
  - **Applicability and ease of use**:
    - can be easily integrated into existing tools by wrapping the original instrumentation code with invocations of the delimitation API methods
    - the query intrinsics API simplifies the implementation of new profilers that focus on the runtime behavior of code optimized by a dynamic compiler (without dealing with additional profiling logic and VM internals)
    - it is applicable in other contexts (e.g. queries can be made directly in the source code)
  - **Improved profiler accuracy**:
    - it eliminates over-profiling and perturbations (that can prevent optimizations) at all
    - requires minor changes to existing tools
    - improves the accuracy of profilers that are susceptible to this kind of observer effect (not a general solution to all kinds of observer effects, e.g. external metrics like wall clock time of method executions)
  - **Testing dynamic compiler optimizations**:
    - finding and reporting performance bugs in a dynamic compiler is difficult
    - the test framework allows writing test cases that help reproducing and locating such performance bugs
    - the test cases can be also used to document the expected behavior of specific optimizations
    - the test framework can also be used by application developers to find performance bugs in their products
    - the test framework requires an initial warmup phase to train the base program code in interpreted (or baseline-compiled) mode (longer execution time)
  - **Performance impact**:
    - the new approach does not introduce any overhead to the execution of the analysis code not does it aggravate the (in)efficiency inherent to a particular analysis
    - in some cases, it may improve the performance of a particular profiler by filtering out unnecessary profiling sites
    - it may affect dynamic compilation time
      - requires additional compilation phases to extract, reconcile and splice the ICGs back into the IR
      - but decreases the complexity of the base-program IR by extracting the ICGs
  - **Implementation**:
    - the proposed approach and the query intrinsics API are implemented in Oracle's Graal compiler 0.6
      - 1448 insertions, 8 deletions
      - explicit marking of the inserted instrumentation code
    - modifications on the DiSL instrumentation framework to automatically insert the necessary delimiation API invocations

---

## Conclusion

- profilers based on **bytecode instrumentation** ofter **yield to inaccurate profiles** because
  - **neither** they are **aware** of the **optimizations** performed by the **dynamic compiler**
  - **not** the **dynamic compiler** is **aware** of the **inserted instrumentation code**
- the **dynami metrics** conveyed in the profiles usually do **not accurately reflex** the **execution of the application without profiling**
- the paper presents a **new approach** to
  - make **inserted profiling code explicit to the dynami compiler**
  - allow the **inserted code to query runtime path decisions in the optimized compiled code**
- **benefits**:
  - allows **improving the accuracy of existing profilers** with minor modifications (tipically) to **wrap the instrumention with invocations of the delimitation API methods**
    - this application is supported by:
      - **allocation profiling**
      - **object lifetime analysis**
      - **callsite profiling**
  - enables **new kinds of profilers** that allow gathering **information** on the **effectiveness** of **dynamic compiler optimizations**
    - this application is supported by:
      - **inlining profiling**
      - **calling-context-aware receiver-type profiling**
  - development of **performance testing tools** for **compiler implementers** and **application developers**
    - this application is supported by the **compiler testing framework** that enables writing **simple test cases** for **individual compiler optimizations** without **interfering** with **the way the dynamic compiler combines these optimizations**
