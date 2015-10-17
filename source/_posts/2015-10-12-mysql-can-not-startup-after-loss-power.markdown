---
layout: post
title: "mysql掉电后无法启动 InnoDB: is in the future!"
date: 2015-10-12 21:59:26 +0800
comments: true
categories:
- mysql
tags:
- mysql
---

公司在节假日会断电，十一忘记了关掉服务器，openstack在系统非正常关机后，无法启动。看了下日志，发现是其使用的mysql起不来。该数据库存储了所有的虚拟机相关信息，若是修复不好，损失惨重啊(别问我为什么没备份，我也不知道...)

分析mysql启动失败的原因，只能从log入手了，打开log发现最后的日志是

<!--more-->

{% codeblock  lang:bash mysql.log %}
error: 'Can't connect to local MySQL server through socket '/var/run/mysqld/mysqld.sock' (2)'
Check that mysqld is running and that the socket: '/var/run/mysqld/mysqld.sock' exists!
{% endcodeblock %}

根据log查看了下，mysqld.sock是存在。google了下这个error，根据一些文档试了下，发现根本没有什么作用，也就是说这可能不是出错的原因。只好继续向前翻log，发现每次试图启动mysql时，都有大量如下日志，我怀疑是因为突然掉电，导致有些log没有写入系统，所以出现了序列号不一致情况。

{% codeblock lang:bash mysql.log %}
...
InnoDB: Error: page 570 log sequence number 7289495
InnoDB: is in the future! Current system log sequence number 5574939.
InnoDB: Your database may be corrupt or you may have copied the InnoDB
InnoDB: tablespace but not the InnoDB log files. See
InnoDB: http://dev.mysql.com/doc/refman/5.5/en/forcing-innodb-recovery.html
InnoDB: for more information.
{% endcodeblock %}

再次google这个error，发现了这样的一篇博文[MySQL log is in the future!](https://boknowsit.wordpress.com/2012/12/22/mysql-log-is-in-the-future/)，这篇博文的方法简单易懂，但是首要问题是我的mysql无法启动，无法启动就不能备份数据。同时也看了下log中提到的[Forcing InnoDB Recovery](http://dev.mysql.com/doc/refman/5.5/en/forcing-innodb-recovery.html)。

Forcing InnoDB Recovery提供了6个等级的修复模式，需要注意的是值大于3的时候，会对数据文件造成永久的破坏，不可恢复。六个等级的介绍摘抄如下：

{% codeblock Forcing InnoDB Recovery %}
1 (SRV_FORCE_IGNORE_CORRUPT)

Lets the server run even if it detects a corrupt page. Tries to make SELECT * FROM tbl_name jump over corrupt index records and pages, which helps in dumping tables.

2 (SRV_FORCE_NO_BACKGROUND)

Prevents the master thread and any purge threads from running. If a crash would occur during the purge operation, this recovery value prevents it.

3 (SRV_FORCE_NO_TRX_UNDO)

Does not run transaction rollbacks after crash recovery.

4 (SRV_FORCE_NO_IBUF_MERGE)

Prevents insert buffer merge operations. If they would cause a crash, does not do them. Does not calculate table statistics. This value can permanently corrupt data files. After using this value, be prepared to drop and recreate all secondary indexes.

5 (SRV_FORCE_NO_UNDO_LOG_SCAN)

Does not look at undo logs when starting the database: InnoDB treats even incomplete transactions as committed. This value can permanently corrupt data files.

6 (SRV_FORCE_NO_LOG_REDO)

Does not do the redo log roll-forward in connection with recovery. This value can permanently corrupt data files. Leaves database pages in an obsolete state, which in turn may introduce more corruption into B-trees and other database structures.
{% endcodeblock %}

使用方法如下，在mysql配置文件中，添加或修改以下配置的值

{% codeblock  lang:bash my.cnf %}
[mysqld]
innodb_force_recovery = 1
{% endcodeblock %}

根据查到的博文提到的方法，我的修复步骤如下：

- 因为我无法启动mysql，所以首先要想办法启动mysql，然后dump数据。从innodb_force_recovery的值1开始尝试，看mysql能否在该修复模式下启动，不到万不得已，不要尝试值为4及以上。
- 在我这里，mysql在值为2时可以启动，这是stop掉数据库，然后备份数据

{% codeblock lang:bash %}
sudo service mysql stop
mysqldump -u root -p --all-databases > all-databases.sql
{% endcodeblock %} 

- 删除掉出错的数据文件

{% codeblock lang:bash %}
mv ib_logfile0 ib_logfile0.bak
mv ib_logfile1 ib_logfile1.bak
mv ibdata1 ibdata1.bak
{% endcodeblock %}

- 启动mysql，然后从备份文件恢复数据

{% codeblock lang:bash %}
sudo service mysql start
mysql -u root -p < all-databases.sql
{% endcodeblock %}

- 因为在修复模式下，在插入数据时报错，也就是说此时是不能写入数据的。所以就关闭掉了修复模式

{% codeblock lang:bash %}
[mysqld]
innodb_force_recovery = 0
{% endcodeblock %}

restart mysql后，再次恢复数据

{% codeblock lang:bash %}
sudo service mysql restart
mysql -u root -p < all-databases.sql
{% endcodeblock %}

- 再次重启下mysql，现在mysql可以正常启动了，并且数据也回复成功。