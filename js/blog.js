/*!
 * Clean Blog v1.0.0 (http://startbootstrap.com)
 * Copyright 2015 Start Bootstrap
 * Licensed under Apache 2.0 (https://github.com/IronSummitMedia/startbootstrap/blob/gh-pages/LICENSE)
 */

// responsive tables
(function() {
    var tables = document.querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
        var wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        tables[i].parentNode.insertBefore(wrapper, tables[i]);
        wrapper.appendChild(tables[i]);
        tables[i].classList.add('table');
    }
})();

// responsive embed videos
(function() {
    var iframes = document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="vimeo.com"]');
    for (var i = 0; i < iframes.length; i++) {
        var wrapper = document.createElement('div');
        wrapper.className = 'embed-responsive embed-responsive-16by9';
        iframes[i].parentNode.insertBefore(wrapper, iframes[i]);
        wrapper.appendChild(iframes[i]);
        iframes[i].classList.add('embed-responsive-item');
    }
})();

// 判断是不是博文页面
function isPages(attr){
    var currentBoolean = document.querySelector('.navbar.navbar-custom').getAttribute(attr);
    if(currentBoolean === 'true'){return true;}
    return false;
}
/*
    滚动函数
    接收三个参数,
        1 接收一个DOM对象
        2 给目标对象切换class
        3 触发的高度 (可选项,如果不指定高度,会将DOM的高度作为触发高度)
*/
function scrollCheck(scrollTarget, toggleClass, scrollHeight){
    document.addEventListener('scroll',function(){
    var currentTop = window.pageYOffset;
        currentTop > (scrollHeight||scrollTarget.clientHeight)
        ?scrollTarget.classList.add(toggleClass)
        :scrollTarget.classList.remove(toggleClass)
    })
}

//主页
(function(){
    if(!isPages('data-ispost')){
        var navbar = document.querySelector('.navbar.navbar-custom')
        navbar.classList.add('is-fixed');
    }

})();

/*
* 先获取H1标签
* 然后滚动出现固定导航条后
* 将其内容放到上面居中显示
* */

/*
    博文页面
*/
(function(){
    if (isPages('data-ispost')){
        var navbar = document.querySelector('.navbar-custom');
        var introHeader = document.querySelector('.intro-header').offsetHeight;
        var introHeader = introHeader > 497 ? introHeader : 400;
        var toc = document.querySelector('.toc-wrap');
        var postTitle = document.querySelector('.post-title-haojen');
        scrollCheck(toc,'toc-fixed',introHeader-60);
        scrollCheck(navbar,'is-fixed');
        scrollCheck(postTitle,'post-title-fixed',introHeader-60);
    }
})();

(function () {
    var navTop = document.querySelector('#nav-top');
    navTop.ondblclick = function () {
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
})();
