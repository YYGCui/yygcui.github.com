---
title: Sails:Node.js的MVC框架
date: 2017-04-09 16:57:09
tags:
- Node.js
- Sails
- MVC
categories:
- 技术积累
comments: true
---
`Sails`是`Node.js`上最流行的`MVC`架构模式的web框架，在设计上参考了`Ruby on Rails`的MVC框架模式，它是基于`Node.js`上最火爆的web框架`Express`开发的。 和其他的MVC框架不同的是，Sails的`MC`在服务端，而`V`在客户端，提供可扩展的、面向服务的数据驱动API。在使用上和其他知名的MVC框架类似，如PHP的`CodeIgnite`。

## 基本用法

`Sails`在使用上提供了极大的便利性，创建一个项目使用命令`sails new <project name>`，运行则在项目目录下执行`sails lift`，然后可以通过`ip:1337`访问，如`localhost:1337`。

在开发上可使用命令`sails generate api cats`来生成`controller`和`model`，分别是`api/controllers/CatsController.js`和`api/models/Cats.js`。`view`则放在`views`目录下，支持多种模板语言，如`ejs`, `swig`等。

这里不深入探讨基本用法，主要侧重在`Sails`比较具有代表性的两个功能上，`Blueprints`和`Waterline`。

## Blueprints

`Blueprints`旨在减少代码数量及节约时间，它提供了一种快速生成API `routes`和`actions`(actions是指controller里定义的方法)的方法。`blueprint API`由两部分组成：`blueprint routes`和`blueprint actions`。

### Blueprint Actions

`Blueprint actions`是指一些通用方法，它们作用于任何`controller`来操作它的同名`model`，例如`CatsController.js`需要有`Cats.js`。这些方法是内置方法，即使`controller`是空的情况下也可以使用。方法如下：`find`, `findOne`, `create`, `update`, `destroy`, `populate`, `add`, `remove`，这些方法也就是下面的数据模型操作的`Waterline`所提供的方法。

### Blueprint routes

`Blueprint routes`是在执行`sails lift`时根据`controller`, `model`, `config`自动生成的路由。默认情况下，一个route指向一个action。有以下三种路由配置，配置文件位于`config/blueprints.js`。

- **RESTful routes** 可通过RESTful接口直接对model进行CRUD操作。如`GET /user`将获取user列表，对应于`user.find()`; `POST /user`将增加一个user，对应于`user.create()`。RESTful路由最好使用`policies`进行保护以免未授权的用户访问。

- **Shortcut routes** 和`RESTful routes`类似，不同的是可直接把`action`编码在url中，如`/user/create?name=joe`可实现上面的`POST`方法的功能。而在这里都是`GET`操作。该路由适合在开发调试阶段使用，产品环境最好关闭。

- **Action routes** 当你在`controller`中实现了一些自定义的方法时，该功能可自动生成对应的路由，如`CatsController.js`中有方法`meow`，那么可通过`/cats/meow`接口访问。这里和其他`MVC`自动生成`controller`的路由一样的用法。和上面不同的是，自定义方法时同名`model`不是必须的。

## Waterline

`Waterline`是数据无关的一个抽象适配层，让你在操作数据时无需关心底层数据库类型，不用写某种数据库专用的操作代码。其底层支持`SQL`型和`NoSQL`型数据库, 如`MySQL`, `MongoDB`等。对接某一具体数据库时，你所需要做的就是在`config/connections.js`里配置适配器，在`config/models.js`配置`models`默认连接的具体适配器，当然也可以在某一具体`model`里指定连接的适配器。这样，需要切换数据库时，只需修改连接的适配器即可，不需要修改一行代码。

`model`中的数据模型结构如下，虽然某些字段看起来时`SQL`型数据库专用的，但定义了这些字段并不影响`NoSQL`型数据库使用。这里该`model`中的`connection`定义会覆盖掉`config/models.js`里的定义。

```js
// Model example
module.exports = {
  connection: 'MySQLDB',
  tableName: 'users',
  attributes: {
    id: {
      type: 'integer',
      unique: true,
      primaryKey: true,
      columnName: 'the_primary_key'
    },
    name: {
      type: 'string',
      columnName: 'full_name'
    }，

    getFullName: function(){
        ...
    }
  }

   enroll: function (options, cb) {
       ...
       cb(err, data);
   }
}
```

从上面的`model`示例可以看到，除了属性字段定义外，还有一些函数定义。这里看到的是我们自定义的函数，`Sails`还提供了一些内置函数。我们还发现函数可以在属性内，也可以在属性外，下面详细介绍一下。

### Model Method

模型方法也称为静态方法或者类方法，放在面向对象里很好理解，就是该类提供的静态方法，不需要实例化可直接使用的方法。上面放在`attributes`外定义的方法就是模型方法。`Sails`提供的内置模型方法涵盖了增删改查，具体方法列表看[官方文档](http://sailsjs.com/documentation/reference/waterline-orm/models)。除了这些方法外，还支持动态查找功能，以上面的`model`为例，该`model`有属性`id`和`name`，那么就有动态查找方法`findById`和`findByName`。

需要注意的是，模型静态方法都是异步方法，方法有两个参数，第一个是输入值，第二个是回调函数。输入值最好是一个完整记录或者时主键。自定义模型静态方法的好处是你可以把数据操作方法放在`controller`之外，放在`model`里，这样你在其他`controller`中也可以重用，当然前提是与`req`和`res`无关的操作。

### Attribute Method

属性方法也称为记录方法或者实例方法，顾名思义，它是作用于某一实例或某一记录的方法。放在`attributes`内定义的方法就是自定义属性方法，当然`Sails`也提供了一些内置的属性方法，包括`.toJSON()`, `.save()`, `.toObject()`，详细介绍看[官方文档](http://sailsjs.com/documentation/reference/waterline-orm/records)。

除了内置方法`.save()`外，属性方法都应当是同步的方法。因为自定义异步属性方法时，很难保证不出现意外结果。在命名属性方法时，最好加上前缀`is`，`get`等以区分其他属性，并对方法提供一定的自解释。

### more...

这里只是管中窥豹，只介绍了最表面的冰山一角，以说明Waterline的功能强大，其他还有`Associations`, `Validations`等等，如有兴趣，强烈建议看一下[官方文档](http://sailsjs.com/documentation/concepts/models-and-orm)。

## 官方文档

- 工程结构请参考[APP Structure](http://sailsjs.com/documentation/anatomy)

- 基本概念请参考[Concepts](http://sailsjs.com/documentation/concepts)

- 接口使用请参考[API Reference](http://sailsjs.com/documentation/reference)
