const menu = getDomFromId('menu');
const backToTop = getDomFromId('backToTop');
const current = document.getElementsByClassName('current')[0].children[0];
const doman = getDomFromId('app').dataset.dev ? 'localhost' : window.location.hostname.replace('www.', '');
const weatherMap = {'000':'无', '01d': '晴天', '01n': '晴天', '02d': '少云', '02n': '少云', '03d': '晴转多云', '03n': '晴转多云', '04d': '多云', '04n': '多云', '09d': '阵雨', '09n': '阵雨', '10d': '小雨', '10n': '小雨', '11d': '雷雨', '11n': '雷雨', '13d': '雪天', '13n': '雪夜', '50d': '雾天', '50n': '雾天' };
let blocked = 0;
let shareID = null;
let domBackup;
let dateSelect = false;
let isTriggered = true;
let lastWidth = window.innerWidth;
let columnNum = 0;
let fontsize = 12;
let date_temp;
let index = 0;
let _scroll = 0;
let searchValue = {
    id: null,
    search: '',
    sort: 0,
    date_range: [],
    date: '',
    tag: -1,
    mode: 0,
    page: 0
};

//社交链接跳转
document.querySelectorAll('.social button').forEach(e => {
    e.onclick = (i) => {
        open(i.target.dataset.href, "_blank")
    }
});

// 阻止表单提交
document.addEventListener('submit', function (e) {
    const form = e.target.closest('form');
    if (form) {
        e.preventDefault();
    }
}, true);

//监听界面交互
document.addEventListener('click', (el) => {
    const e = el.target;

    if (e.id == 'login_B') {
        //登录或登出
        loginPanel();
    }

    if (e.id == 'setting_B') {
        //设置面板
        settingPanel();
    }

    if (e.id == 'newpost_B') {
        //添加文章
        if (getDomFromId('editor')) {
            return;
        }
        PostEditorPanel();
    }

    if (getDomFromId("tools") && !(e.closest("#tools") || e.closest("#menu"))) {
        document.querySelector(".icon-close") ? document.querySelector(".icon-close").click() : document.querySelector("#current_B").click();
    }

    if (e.id == 'tags_B') {
        //标签面板
        toolsPanel('tags');
    }

    if (e.id == 'search_B') {
        //搜索面板
        toolsPanel('search');
    }

    if (e.id == 'current_B') {
        //日历面板
        toolsPanel('current');
    }

    if (e.id == 'loadmore_B') {
        //加载更多
        loadMore();
    }

    if (e.id == 'backToTop') {
        //回到顶部
        toWindowTop();
    }

    if (e.closest('.annex') && !e.closest('.md-annex-hidden') && e.closest('.post') && !e.closest('.lb_disable') && !e.closest('.icon-trash')) {
        lightBoxPanel(e);
    }

    if (e.closest('.avatar')) {
        //头像放大
        enlargeImage(e);
    }

    if (e.className == 'Revise') {
        popup(el, (mode) => {
            switch (mode) {
                case 'editor':
                    setTimeout(() => {
                        changePost(e);
                    }, 200);
                    break;
                case 'delete':
                    deletePost(e);
                    break;
                case 'archive':
                    archivePost(e);
                    break;
            }
        });
    }

    if (e.classList.contains(('mybutton'))) {
        //按钮动画
        const btnClass = e.classList;
        const btndwn = btnClass.contains("dark") ? "darkactive" : "lightactive";
        btnClass.add(btndwn);
        setTimeout(() => {
            btnClass.remove(btndwn);
        }, 100);
    }

    if (e.closest('.read_more')) {
        const dom = e.closest('.post').querySelector('.content')
        const btnBg = e.parentElement;
        dom.style.maxHeight = dom.scrollHeight + 'px';
        btnBg.setAttribute('style', 'box-shadow: 0 0 10px 20px var(--shadow-color)')
        setTimeout(() => {
            btnBg.setAttribute('style', 'box-shadow: 0 0 20px 40px var(--shadow-color)')
        }, 100);
        setTimeout(() => {
            btnBg.remove();
        }, 300);
    }

    if(e.id == 'editor_date'){
        e.nextElementSibling.focus();
    }
});

//监听窗口变化
window.addEventListener('resize', debounce(function () {
    const currentWidth = window.innerWidth;
    if (currentWidth !== lastWidth) {
        // 仅当宽度变化时执行
        autoUpdateMenuPosition();
        pcCalendar();
        lastWidth = currentWidth; // 更新缓存
        const width = window.innerWidth;
        if (width < 881) {
            fontsize = 12;
        } else if (width < 1240) {
            if (columnNum !== 1) {
                location.reload()
                columnNum = 1
            }
        } else if (width > 1240 && width <= 1600) {
            fontsize = 14;
            if (columnNum !== 2) {
                location.reload()
                columnNum = 2
            }
        } else if (width > 1600) {
            if (columnNum !== 3) {
                location.reload()
                columnNum = 3
            }
        }
    }
}, 15));

//监听页面滚动 ==回到顶部 ==导航栏日期 ==导航栏阴影
window.addEventListener('scroll', debounce(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    //=====回到顶部
    if (document.body.scrollHeight / 1.5 < window.scrollY + window.innerHeight) {
        if (scrollTop > 2000 && _scroll > scrollTop) {
            backToTop.style.bottom = '5rem';
            backToTop.style.pointerEvents = 'all';
        } else {
            _btt();
        }
    } else {
        _btt();
    }
    if (Math.abs(_scroll - scrollTop) > 200) {
        _scroll = scrollTop;
    }
    //====导航栏阴影
    (() => {
        if (menu.offsetTop <= this.pageYOffset + 1 && window.innerWidth < 881) {
            if (menu.style.boxShadow !== '') {
                return;
            }
            menu.style.boxShadow = '#00000030 -1px 1px 4px';
        } else {
            if (menu.style.boxShadow == '') {
                return;
            }
            menu.style.boxShadow = '';
        }
    })();

    //====导航栏日期
    Array.from(document.getElementsByClassName('post'))
        .filter(postDom => !postDom.classList.contains('editor'))
        .forEach(postDom => {
            const date = postDom.querySelector('.date2').innerText;
            if (ifElementOverlap(menu, postDom)) {
                if (date !== current.innerText.trim()) {
                    //view
                    current.style.display = 'flex';
                    current.disabled = '';

                    current.innerHTML = `${date}<i class="icon-expand"></i>`;
                    current.dataset.date = date;
                }
            }
        })

    if (!(menu.offsetTop <= this.pageYOffset + 1) && document.querySelector('.date')) {
        if (dateSelect) return;
        if (document.querySelector('._calendar') !== null) {
            current.innerHTML = `<i class="icon icon-calendar"></i>`;
        } else {
            current.innerText = current.dataset.date = '';
            current.style.display = 'none';
            current.disabled = true;
        }
    }
    checkVisibility(document.querySelector('.loadmore'), window.innerHeight);
}, 15))

//当页面加载时
window.onload = () => {
    if (getDomFromId('menu').dataset.s == 0) {
        shareID = new URL(window.location.href).searchParams.get('id');
    } else {
        const currentUrl = new URL(window.location.href);
        const path = currentUrl.pathname;
        const share_id = path.substring(path.lastIndexOf('/') + 1).split('.html')[0];
        shareID = share_id == '' ? null : share_id;
    }
    autoUpdateMenuPosition();
    searchValue.page = 0;
    searchValue.sort = 0;
    loadPostList({ page: searchValue.page, id: shareID }, true);
    setTimeout(() => {
        getDomFromId('app').classList.remove('no-transition');
    }, 100);

    //缓存标签，日历
    get_tags();
    get_yearmonth(() => {
        pcCalendar();
    });
}

//登录超时
function updateLoginStatus() {
    showBubble('登录超时', 'error')
    setTimeout(() => {
        getDomFromId('login_B').click();
        searchValue.page = 0;
        searchValue.sort = 0;
        loadPostList({ page: searchValue.page }, true);
        getDomFromId('menu').querySelectorAll('button').forEach(i => {
            i.setAttribute('style', 'color: var(--MAIN_COLOR) !important;');
        })
        if (getDomFromId('set_panel')) {
            getDomFromId('set_close').click();
        }
        toWindowTop();
        getDomFromId('login_B').click();
    }, 100);
};

function popup(e, callback) {
    if (getDomFromId('PostMenu')) {
        return;
    }
    const parent = e.target.closest('.post');
    const _eidt = createElement({ type: 'div', attributes: { className: 'PostMenuItem' } })
    _eidt.innerText = "编辑";
    const _delete = _eidt.cloneNode(true);
    _delete.innerText = "删除";
    const _archive = _eidt.cloneNode(true);
    _archive.innerText = "归档";
    const extMenu = createElement({ type: 'div', attributes: { id: 'PostMenu' }, children: [_eidt, _delete, _archive] })
    const _after = createElement({ type: 'div', attributes: { id: 'PostMenu1' } })
    parent.insertBefore(extMenu, parent.children[0]);
    parent.insertBefore(_after, extMenu);
    const pen = e.target;
    const penrect = pen.getBoundingClientRect();
    const parentrect = parent.getBoundingClientRect();
    const DomWidth = parentrect.width;
    const extMenurect = extMenu.getBoundingClientRect();
    const clickX = e.offsetX + penrect.width / 2;
    let _offset = 0;
    if (clickX + extMenurect.width / 2 > DomWidth) {
        _offset = DomWidth - (clickX + extMenurect.width / 2) - 10;
    } else if (clickX - extMenurect.width / 2 < 0) {
        _offset = -(clickX - extMenurect.width / 2) + 10;
    }
    const left = (clickX - extMenurect.width / 2) + _offset;
    const top = pen.offsetTop + penrect.height + 5;
    extMenu.style.left = left + 'px';
    extMenu.style.top = top + 'px';
    _after.style.left = (clickX - fontsize/2) + 'px';
    _after.style.top = top + 'px';
    _eidt.onclick = () => {
        callback('editor');
    }
    _delete.onclick = () => {
        callback('delete');
    }
    _archive.onclick = () => {
        callback('archive');
    }
    let Poclose = false;
    document.addEventListener('click', () => {
        if (Poclose) return;
        closePopup();
        Poclose = true;
    }, { once: true })

    document.addEventListener('scroll', () => {
        if (Poclose) return;
        closePopup();
        Poclose = true;
    }, { once: true })
}

function closePopup() {
    try {
        getDomFromId('PostMenu').style.animation = 'popupOut .2s ease forwards';
        getDomFromId('PostMenu1').style.animation = 'popupOut1 .2s ease forwards';
    } catch (e) { };
    setTimeout(() => {
        try {
            getDomFromId('PostMenu').remove();
            getDomFromId('PostMenu1').remove();
        } catch (e) { };
    }, 300);
}

//功能实现： 访客记录 网站可见
//多语言支持//json后台返回不同语言的json

//端口过滤！


//自动打包
//https://github.com/pk-fr/yakpro-po?tab=readme-ov-file


//日历矫正函数，标签矫正函数

//meta部分添加更多图标：分享图标，留言图标
//支持URL参数标签列表和postid列表

//php中的输出语句，看情况用die和echo