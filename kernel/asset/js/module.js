function loginPanel() {
    const e = getDomFromId('login_B');
    const addbutton = getDomFromId('newpost_B');
    const setbutton = getDomFromId('setting_B');


    if (e.classList.contains('icon-user')) {
        //login
        coolingElement(e);

        //创建登录DOM
        const userpass = createElement({
            type: 'input',
            attributes: {
                id: 'userpass',
                className: 'passinput',
                type: 'password',
                placeholder: 'Enter your password',
                maxLength: 16
            }
        });

        const iconeye = createElement({
            type: 'i',
            attributes: {
                id: 'eye',
                className: 'icon-eye'
            }
        })
        const loginform = createElement({
            type: 'form',
            attributes: {
                id: 'loginform'
            },
            children: [iconeye, userpass]
        });
        const sign = document.querySelector(".user p");
        const social = document.getElementsByClassName("social")[0];
        const userPanel = document.getElementsByClassName('user')[0];

        //插入DOM
        sign.insertAdjacentElement('afterend', loginform);


        //聚焦登录面板
        userPanel.style.transition = 'transform .3s ease-in-out';
        setTimeout(() => {
            userpass.style.opacity = "1";
            toWindowTop();
        }, 100);
        tabIndexs(social, false);

        classNameSwitch(e, "icon-user", "icon-close");

        viewLoginForm(true);

        userpass.focus();

        //密码输入判断
        userpass.addEventListener("keydown", function (k) {
            if (k.key === "Enter") {
                setTimeout(() => {
                    userpass.focus();
                }, 600);
                if (this.value.length < 4) {
                    showBubble('密码长度需 >= 4', 'warning')
                    return;
                }
                //登录开始界面

                ElementDisable(e, true);
                ElementDisable(userpass, true);

                async function _loginif() {
                    let fetch_login = new myFetch();

                    fetch_login.setDefaultConfig({
                        onError: (error, attempt, type) => {
                            if (type == 'final') {
                                showBubble('登录失败', 'error', 1000, true);
                                ElementDisable(userpass, false);
                            }
                        },
                        // onRetry: (error, attempt, type) => {
                        //     console.info(error.message);
                        // },
                        onTimeout: (error, attempt) => {
                            showBubble('重试中...', 'warning', 0, true)
                        },
                        // onCancel: (error, attempt, type) => {
                        //     console.info(error.message);
                        // },
                        // onSuccess: () => {
                        //     console.info('login pass');
                        // }
                    });
                    // 获取站点配置（包含域名）
                    let domainConfig = doman;
                    try {
                        const domainRes = await fetch('/kernel/api.php', {
                            method: 'POST',
                            body: new URLSearchParams({ api: 'get_domain_config' })
                        });
                        const domainData = await domainRes.json();
                        if (domainData.code === 10200 && domainData.data && domainData.data.domain) {
                            domainConfig = domainData.data.domain;
                        }
                    } catch (err) {
                        // 如果获取失败，使用当前域名
                    }
                    const pass = await hashString('SHA-256', userpass.value + domainConfig + getDomFromId('app').dataset.uid);
                    let login = await fetch_login.fetch('/kernel/api.php', {
                        method: 'POST',
                        body: new URLSearchParams({
                            api: 'login',
                            pass: pass
                        })
                    }, {
                        'retries': 1,
                        'retryDelay': 1000,
                        'timeout': 2000,
                        'exponentialDelay': false,
                    })

                    e.disabled = false;
                    e.style.pointerEvents = 'auto';

                    if (!login) {
                        return 'no return';
                    }

                    let result = await login.text();
                    const Data = JSON.parse(result);
                    switch (Data['code']) {
                        case 10200:
                            //成功
                            get_tags();
                            showBubble('', '', 1, true);
                            get_yearmonth();
                            ElementDisable(e, false);
                            setTimeout(() => {
                                iconeye.className = "";
                                iconeye.style.color = "#39393A";
                                Object.assign(userpass, {
                                    value: "",
                                    type: "text",
                                    className: "passinput1",
                                    style: "opacity:1;background-color:#00ff80",
                                    placeholder: "Welcome",
                                    disabled: "true",
                                });
                            }, 250);
                            setTimeout(() => {
                                ElementFade(addbutton, true);
                                ElementFade(setbutton, true);
                                claerLoginPanel(e, "icon-exit");
                            }, 1000);
                            searchValue.page = 0;
                            searchValue.sort = 0;
                            setTimeout(() => {
                                loadPostList({ page: searchValue.page }, true);
                            }, 200);
                            localStorage.setItem('token', Data['token']);
                            loadResourcesInOrder(Data['data'][0], false);
                            hashPasswordSync(userpass.value).then(hashHex => {
                                localStorage.setItem('key', hashHex);
                            });
                            getDomFromId('menu').dataset.z = Data['data'][1][0];
                            getDomFromId('menu').dataset.e = Data['data'][1][1];
                            getDomFromId('menu').dataset.t = Data['data'][1][2];
                            getDomFromId('menu').dataset.c = Data['data'][1][3];
                            break;
                        case 10429:
                            //请求频繁
                            let time = Data['time'];
                            showBubble(`请于${time}分钟后重试`, 'warning', 1000, true);
                            coolingElement(userpass, time * 6000);
                            claerLoginPanel(e, "icon-user");
                            break;
                        default:
                            //失败

                            showBubble('登录失败', 'error', 1000, true);
                            ElementDisable(userpass, false);

                            setTimeout(() => {
                                iconeye.className = "";
                                iconeye.style.color = "#39393A";
                                userpass.value = "";
                                Object.assign(userpass, {
                                    style: "opacity:1;background-color:#ff0044;",
                                    disabled: 'true',
                                    type: 'text',
                                    className: "passinput2",
                                    placeholder: 'Pas Error',
                                })
                                shakeElement(userpass);
                            }, 200);
                            setTimeout(() => {
                                iconeye.className = "icon-eye";
                                iconeye.style.display = "none";
                                Object.assign(userpass, {
                                    style: "opacity:1;background-color:#fff",
                                    disabled: '',
                                    type: 'text',
                                    className: "passinput",
                                    placeholder: 'Enter your password',
                                })
                                userpass.focus();
                            }, 1000);
                            break;
                    }
                }

                _loginif();
            }
        });
        userpass.addEventListener("input", function (e) {
            if (e.target.value.length == 0) {
                iconeye.style.display = "none";
            } else {
                iconeye.style.display = "block";
            }
        });
        iconeye.onclick = () => {
            if (userpass.type == "text") {
                userpass.type = "password";
                iconeye.className = 'icon-eye';
                userpass.focus()
                return;
            } else {
                userpass.type = "text";
                iconeye.className = 'icon-eye-blocked';
                userpass.focus()
                return;
            }
        };

    } else if (e.classList.contains('icon-close')) {
        //logout

        //失焦登录面板
        claerLoginPanel(e, "icon-user");
        ElementDisable(e, false)
        coolingElement(e);

    } else if (e.classList.contains('icon-exit')) {

        //判断登录面板是否存在跳过

        // 刷新界面
        ElementDisable(e, true);

        const logout_fetch = new myFetch();

        logout_fetch.setDefaultConfig({
            onError: (type) => {
                if (type == 'final') {
                    showBubble('登出错误', 'error', 1000, true)
                }
            },
            onTimeout: (error, attempt) => {
                showBubble('重试中...', 'warning', 0, true)
            },

        });
        logout_fetch.fetch('/kernel/api.php', {
            method: 'POST',
            body: new URLSearchParams({
                api: 'login',
                pass: 'exit'
            })
        }, {
            'retries': 2,
            'retryDelay': 1000,
            'exponentialDelay': true,
        })
            .then(response => {
                if (!response.ok) {
                    throw 'response error';
                }
                return response.json();
            })
            .then(data => {
                if (data['code'] == 10203) {
                    showBubble('', '', 1, true);
                    ElementFade(addbutton, false);
                    ElementFade(setbutton, false);
                    ElementDisable(e, false);
                    classNameSwitch(e, 'icon-exit', 'icon-user');
                    searchValue.page = 0;
                    searchValue.sort = 0;
                    loadPostList({ page: searchValue.page }, true);
                    localStorage.removeItem('token');
                    localStorage.removeItem('key');
                    get_tags();
                    get_yearmonth();
                } else {
                    showBubble('登出失败', 'error', 1000, true)
                    console.log(data)
                }
            })

        //更新页面DOM状态
    }
    function claerLoginPanel(e, i) {
        const _i = getDomFromId("userpass");
        const _e = getDomFromId("eye");
        const _s = document.getElementsByClassName('social')[0];
        _e.style.opacity = "0";
        _i.style.opacity = "0";
        setTimeout(() => {

            //延迟清除DOM
            getDomFromId("loginform").remove();
        }, 300);
        tabIndexs(_s, true)
        classNameSwitch(e, i, "icon-close")
        viewLoginForm(false);
        return;
    }
}

function settingPanel() {
    get_fetch({
        api: 'login_status'
    }, info => {
        const Data = JSON.parse(info);
        if (Data.code === 10200) {
            settingsPanel();
        } else {
            updateLoginStatus();
        }
    })
}

function toolsPanel(mode) {
    const search = getDomFromId('search_B');
    const tag = getDomFromId('tags_B');
    const current = getDomFromId('current_B');
    const _t_p = getDomFromId('tools');
    const map = new Map([
        ['_search', [search, 'icon-search', 'icon-close', 'icon-clear']],
        ['_tags', [tag, 'icon-tags', 'icon-close']],
        ['_calendar', [current, 'current-date', 'current-date-open']],
    ]);
    coolingElement(menu, 300);

    function _r(_t) {
        if (_t) {
            const s = map.get(_t.className);
            if (_t.className == '_search') {
                if (search.classList.contains('icon-clear')) {
                    classNameSwitch(s[0], s[2], s[3]);
                }
            }
            classNameSwitch(s[0], s[1], s[2]);
            _t.remove();
        }
    }
    function _c(_t) {
        _t.style.overflow = 'hidden';
        _t.style.gridTemplateRows = '0fr';
        setTimeout(() => {
            _t.style.display = 'none';
            _t ? _t.remove() : '';
        }, 300);

    }

    function _o() {
        const _t = getDomFromId('tools');
        _t.style.display = 'grid';
        setTimeout(() => {
            _t.style.gridTemplateRows = '1fr';
        }, 10);
        setTimeout(() => {
            _t.style.overflow = 'visible';
        }, 300)
    }
    if (mode == 'search') {
        if (search.classList.contains('icon-search')) {
            //open
            _r(_t_p);
            createToolPanel('_search');
            _o();
            ElementToViewTop(getDomFromId('menu'))
            if (searchValue.search !== '' || searchValue.sort !== 0 || searchValue.date_range.length !== 0 || searchValue.mode !== 0) {
                classNameSwitch(search, 'icon-search', 'icon-clear');
                search.style.color = '#39393A';
            } else {
                classNameSwitch(search, 'icon-search', 'icon-close');
            }
        } else if (search.classList.contains('icon-close')) {
            classNameSwitch(search, 'icon-search', 'icon-close');
            //close
            if (searchValue.search !== '' || searchValue.sort !== 0 || searchValue.date_range.length !== 0 || searchValue.mode !== 0) {
                resSearchValue();
                search.style.color = '#39393A';
            }
            _c(_t_p);
        } else if (search.classList.contains('icon-clear')) {
            //clear
            resSearchValue();
            classNameSwitch(search, 'icon-clear', 'icon-search');
            search.style.color = '#39393A';
            searchValue.page = 0;
            searchValue.sort = 0;
            loadPostList({ page: searchValue.page });
            _c(_t_p);
        }
        return;
    } else if (mode == 'tags') {
        classNameSwitch(tag, 'icon-tags', 'icon-close');
        if (tag.classList.contains('icon-close')) {
            //open
            _r(_t_p);
            createToolPanel('_tags');
            _o();
            ElementToViewTop(getDomFromId('menu'))
        } else {
            //close
            _c(_t_p);
        }
        return;
    } else if (mode == 'current') {
        classNameSwitch(current, 'current-date', 'current-date-open');
        if (current.classList.contains('current-date-open')) {
            //open
            _r(_t_p);
            createToolPanel('_calendar');
            const dom = getDomFromId('current_B');
            const d = getYMD(dom.dataset.date);
            calendarPanel('calendarPanel', d[0], d[1], d[2], (_date) => {
                searchValue.page = 0;
                searchValue.sort = 2;
                dateSelect = true;
                let color = 'var(--BUTTON_COLOR)';
                current.innerHTML = _date + '<i class="icon-expand"></i>';
                current.dataset.date = _date;
                if (d[0] + '-' + d[1] + '-' + d[2] == _date) {
                    color = 'var(--MAIN_COLOR)';
                    dateSelect = false;
                    _date = '';
                    resSearchValue();
                    current.innerHTML = '';
                    current.dataset.date = '';
                }
                loadPostList({ date: _date, page: searchValue.page, sort: searchValue.sort });
                dom.style.color = color;
                current.click();
            });
            _o();
            // ElementToViewTop(getDomFromId('menu'))
        } else {
            //close
            _c(_t_p);
        }
        return;
    }
}

function lightBoxPanel(e) {
    const valve = 0.2;
    const div = e.parentElement;
    const current = e.parentElement;
    const root = e.closest('.annex');
    const iseEdit = root.classList.contains('file_upload');
    let root_len = root.children.length;
    if (iseEdit) {
        root_len = root_len - 1;
    }
    const emptyE = createElement({ type: 'div' });
    let child_index = Array.from(root.children).indexOf(div);
    let startX, startY, moveX, moveY, isSwiping, isDblclick = false;
    let cooling = 0;

    const num = createElement({
        type: 'button',
        attributes: {
            className: 'mybutton light',
            style: 'opacity:1',
            disabled: true,
            innerHTML: child_index + 1 + '/' + root_len
        }
    });
    const tip = createElement({
        type: 'button',
        attributes: {
            className: 'mybutton light',
            disabled: true,
            innerHTML: '双击缩放图片'
        }
    });
    const close = createElement({
        type: 'button',
        attributes: {
            className: 'mybutton light icon-close'
        }
    });
    const info = createElement({
        type: 'div',
        attributes: {
            className: 'mybutton lb_info icon-info',
        }
    })
    info.setAttribute('data-info', current.children[0].dataset.info);

    const infopan = createElement({
        type: 'span',
        attributes: {
            className: 'lb_info_pan',
        }
    })
    const toolbar = createElement({
        type: 'div',
        attributes: {
            className: 'lb_toolbar'
        },
        children: [num, tip, close, info]
    })
    const container = createElement({
        type: 'div',
        attributes: {
            className: 'lb_container',
            style: 'width: 98vw;'
        }
    })
    container.style.transition = 'none';
    const lightbox = createElement({
        type: 'div',
        attributes: {
            id: 'lightBox'
        },
        children: [toolbar, container]
    })

    document.body.style.overflow = 'hidden';
    getDomFromId('app').style.pointerEvents = 'none';
    document.body.insertAdjacentElement('afterbegin', lightbox);

    if (current.classList.contains('jpg')) {
        tip.style.opacity = 1;
    } else {
        tip.style.opacity = 0;
    }

    child_index > 0 ? container.appendChild(loadmedia(root.children[child_index - 1])) : container.appendChild(emptyE);
    const one = loadmedia(current);
    container.appendChild(one);
    one.style.transition = 'none';
    one.style.opacity = 0;
    one.autoplay = true;
    child_index < root_len - 1 ? container.appendChild(loadmedia(root.children[child_index + 1])) : container.appendChild(emptyE.cloneNode());

    checkMediaLoaded(one, () => {
        widthInde(one);
        setTimeout(() => {
            one.style.opacity = 1;
            container.style.transition = 'transition: all .3s ease';
            one.style.transition = 'all .2s cubic-bezier(0, 0, .58, 1)';
        }, 200);
    })

    info.onclick = () => {
        const map = { 'name': '文件名: %s', 'type': '媒体类型: %s', 'reso': '分辨率: %s', 'size': '资源大小: %s', 'dept': '位深信息: %s<br>', 'shot': '拍摄时间: %s', 'expo': '曝光时间: %s', 'fnum': '光圈值: %s', 'isos': '感光度: %s', 'flen': '焦距: %s', 'mode': '拍摄设备: %s', 'soft': '软件版本: %s', 'desc': '描述信息: %s<br>', 'zipm': '压缩: %s', 'zips': '原始大小: %s' };
        const data = new Map(JSON.parse(info.getAttribute('data-info')));
        let _info = `<h3>媒体详情: </h3>`;
        let _temp = false;
        data.forEach((value, key) => {
            const mode = { 'g0': '--', 'g2': 'GD有损压缩', 'i2': 'Imagick有损压缩', 'i1': 'Imagick无损压缩', 'g1': 'GD无损压缩' }[value];
            if (!map[key]) return;
            if (key == 'zipm') {
                _temp = value == 'g0' ? false : true;
                _info += `${map[key].replace("%s", mode)}<br>`;
                return;
            }
            if (key == 'zips') {
                _temp ? _info += `${map[key].replace("%s", value)}<br>` : '';
                return;
            } else {
                _info += `${map[key].replace("%s", value)}<br>`;
            }
        });
        infopan.innerHTML = _info;

        if (document.getElementsByClassName('lb_info_pan')[0]) {
            ElementFade(infopan, false, true)
        } else {
            ElementFade(infopan, true)
            toolbar.appendChild(infopan);
        }
    }
    infopan.onclick = () => {
        ElementFade(infopan, false, true)
    }

    lightbox.addEventListener('click', (e) => {
        if (e.target.id == 'lightBox' || e.target.classList.contains('icon-close')) {
            //close
            lightbox.style.opacity = 0;
            lightbox.style.pointerEvents = 'none';
            getDomFromId('app').style.pointerEvents = '';
            document.body.style.overflow = '';
            setTimeout(() => {
                lightbox.remove();
            }, 300);
        }
    })

    container.addEventListener('dblclick', (elem) => {
        const dom = elem.target;
        const t_h = toolbar.style.opacity;
        if (dom.tagName == 'IMG') {
            //创建监听函数
            let touchStartHandler,
                touchMoveHandler,
                touchEndHandler,
                wheelMoveHandler,
                mouseStartHandler,
                mouseMoveHandler,
                mouseEndHandler;

            if (t_h == 1 || t_h == '') {
                toolbar.style.opacity = 0;
                isDblclick = true;


                let screenXstart,
                    screenYstart,
                    screenXmove,
                    screenYmove,
                    isSwiping = false;

                let win2X = window.innerWidth / 2;
                let win2Y = window.innerHeight / 2;

                //初始化缩放比例
                const maxScale = 10;
                let scale = 3;
                let currentScale = scale;
                let initialDistance = 0;


                //初始化 变换原点
                let originX = elem.offsetX;
                let originY = elem.offsetY;

                //初始化变换偏移
                let translateX = win2X - elem.clientX;
                let translateY = win2Y - elem.clientY;

                let screenXend = 0;
                let screenYend = 0;


                function applyTransform() {
                    dom.style.transformOrigin = `${originX}px ${originY}px`;
                    dom.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
                }
                applyTransform();

                touchStartHandler = (e) => {
                    isSwiping = true;
                    //触摸开始
                    if (e.touches.length === 2) {
                        // 双指触摸，计算初始距离
                        initialDistance = getDistance(
                            e.touches[0].clientX, e.touches[0].clientY,
                            e.touches[1].clientX, e.touches[1].clientY
                        );
                    }
                    const touch = e.touches[0];
                    screenXstart = touch.clientX;
                    screenYstart = touch.clientY;
                }
                touchMoveHandler = (e) => {
                    e.preventDefault()
                    if (!isSwiping) return;
                    //触摸拖动
                    if (e.touches.length === 2) {
                        // 计算当前双指距离
                        const currentDistance = getDistance(
                            e.touches[0].clientX, e.touches[0].clientY,
                            e.touches[1].clientX, e.touches[1].clientY
                        );

                        if (initialDistance > 0) {
                            currentScale = scale * (currentDistance / initialDistance);
                            currentScale = Math.max(0.8, Math.min(currentScale, maxScale));
                            applyTransform();
                        }
                        return;
                    }
                    const touch = e.touches[0];
                    screenXmove = touch.clientX;
                    screenYmove = touch.clientY;
                    move()
                }
                touchEndHandler = () => {
                    end()
                }

                wheelMoveHandler = (e) => {
                    //滚轮
                    const deltaY = e.deltaY; // 垂直滚动量
                    if (deltaY > 0) {
                        currentScale -= Math.abs(e.deltaY / 800);
                    } else {
                        currentScale += Math.abs(e.deltaY / 800);
                    }
                    currentScale = Math.max(0.8, Math.min(currentScale, maxScale));
                    applyTransform();
                }
                mouseStartHandler = (e) => {
                    e.preventDefault()
                    dom.style.cursor = 'grabbing';
                    isSwiping = true;
                    //鼠标开始
                    screenXstart = e.clientX;
                    screenYstart = e.clientY;
                }
                mouseMoveHandler = (e) => {
                    e.preventDefault()
                    if (!isSwiping) return;
                    dom.style.cursor = 'grabbing';
                    //鼠标拖动
                    screenXmove = e.clientX;
                    screenYmove = e.clientY;
                    move(e)
                }
                mouseEndHandler = () => {
                    end()

                }

                function move() {
                    const moveX = (screenXmove - screenXstart) * (1 / currentScale);
                    const moveY = (screenYmove - screenYstart) * (1 / currentScale);

                    translateX += moveX;
                    translateY += moveY;
                    originX -= moveX;
                    originY -= moveY;


                    screenXend += moveX;
                    screenYend += moveY;

                    screenXstart = screenXmove;
                    screenYstart = screenYmove;

                    applyTransform();
                }

                function end() {
                    isSwiping = false;
                    scale = currentScale;
                    dom.style.cursor = 'grab';
                    initialDistance = 0;
                    screenXend = 0;
                    screenYend = 0;
                    applyTransform();
                }

                // 添加事件监听
                dom.addEventListener('touchstart', touchStartHandler);
                dom.addEventListener('touchmove', touchMoveHandler);
                dom.addEventListener('touchend', touchEndHandler);
                dom.addEventListener('wheel', wheelMoveHandler);
                dom.addEventListener('mousedown', mouseStartHandler);
                dom.addEventListener('mousemove', mouseMoveHandler);
                dom.addEventListener('mouseup', mouseEndHandler);
                // 保存处理函数以便后续移除
                dom._touchHandlers = {
                    touchStartHandler,
                    touchMoveHandler,
                    touchEndHandler,
                    wheelMoveHandler,
                    mouseStartHandler,
                    mouseMoveHandler,
                    mouseEndHandler
                };
                setTimeout(() => {
                    dom.style.transition = 'none';
                    setCssVariable('--lb-dsp', 'none');
                }, 200);
            } else {
                dom.style.transition = 'all .2s cubic-bezier(0, 0, .58, 1)';
                isDblclick = false;
                toolbar.style.opacity = 1;
                setCssVariable('--lb-dsp', 'block');

                //重置变换
                dom.style.transformOrigin = `center center`;
                dom.style.transform = `translate(0px,0px) scale(1)`;
                dom.style.cursor = 'auto';

                // 移除所有事件监听器（如果存在）
                if (dom._touchHandlers) {
                    dom.removeEventListener('touchstart', dom._touchHandlers.touchStartHandler);
                    dom.removeEventListener('touchmove', dom._touchHandlers.touchMoveHandler);
                    dom.removeEventListener('touchend', dom._touchHandlers.touchEndHandler);
                    dom.removeEventListener('wheel', dom._touchHandlers.wheelMoveHandler);
                    dom.removeEventListener('mousedown', dom._touchHandlers.mouseStartHandler);
                    dom.removeEventListener('mousemove', dom._touchHandlers.mouseMoveHandler);
                    dom.removeEventListener('mouseup', dom._touchHandlers.mouseEndHandler);
                    delete dom._touchHandlers;
                }
            }
        }
    })

    container.addEventListener('click', () => {
        classNameSwitch(toolbar, "hidden", "display");
        ElementFade(infopan, false, true)
    })

    lightbox.addEventListener('touchstart', (e) => {
        container.style.transition = 'all .3s ease';
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isSwiping = true;
        moveX = 0;
        moveY = 0;
    });

    lightbox.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isSwiping || isDblclick) return;
        const touch = e.touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        if (Math.abs(deltaX) < Math.abs(deltaY)) {
            moveY = deltaY;
            container.style.transform = 'translateY(' + deltaY + 'px)';
            lightbox.style.opacity = 1 - (Math.abs(deltaY) / 300) * 0.8;
        }

        if (new Date().getTime() < cooling && cooling !== 0) {
            return;
        }

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            moveX = deltaX;
            moveY = deltaY;
            container.style.transform = 'translateX(' + deltaX + 'px)';
        }
    });

    lightbox.addEventListener('touchend', () => {
        if (Math.abs(moveY) > window.innerHeight * valve) {
            lightbox.style.opacity = 0;
            lightbox.style.pointerEvents = 'none';
            document.body.style.overflow = '';
            getDomFromId('app').style.pointerEvents = '';
            setTimeout(() => {
                lightbox.remove();
            }, 200);
        } else {
            lightbox.style.opacity = 1;
        }

        if (new Date().getTime() < cooling && cooling !== 0) {
            return;
        }
        isSwiping = false;
        if (Math.abs(moveX) < window.innerWidth * valve) {
            container.style.transform = 'translateX(0px)';
        } else if (moveX > 0 && moveX !== 0) {
            loadPrevPicture();
        } else if (moveX < 0 && moveX !== 0) {
            loadNextPicture();
        }
        setTimeout(() => {
            container.style.transform = 'translateX(0px)';
        }, 300);
    });

    lightbox.addEventListener('wheel', (e) => {
        if (isDblclick) return;
        container.style.transition = 'all .3s';
        if (new Date().getTime() < cooling && cooling !== 0) {
            return;
        }
        const deltaY = e.deltaY; // 垂直滚动量
        if (deltaY > 0) {
            loadNextPicture();
        } else {
            loadPrevPicture();
        }
        setTimeout(() => {
            container.style.transform = 'translateX(0px)';
        }, 300);
    })

    function loadPrevPicture() {
        ElementFade(infopan, false, true)
        if (child_index > 0) {
            child_index--;
            container.style.transform = `translateX(${window.innerWidth}px)`;
            num.innerHTML = child_index + 1 + '/' + root_len;
            info.setAttribute('data-info', container.children[0].dataset.info);
            tip.style.opacity = container.children[0].tagName == 'IMG' ? 1 : 0;
            cooling = new Date().getTime() + 400;
            widthInde(container.children[0]);
            setTimeout(() => {
                container.style.transition = 'none'
                refersh(-1);
                if (container.children[1].tagName == 'VIDEO') {
                    container.children[1].autoplay = true;
                    container.children[1].load();
                }
                if (container.children[2].tagName == 'VIDEO') {
                    container.children[2].pause();
                }
            }, 300);
        } else {
            container.style.transform = 'translateX(0px)';
        }
    }

    function loadNextPicture() {
        ElementFade(infopan, false, true)
        if (child_index < root_len - 1) {
            child_index++;
            container.style.transform = `translateX(${-window.innerWidth}px)`;
            num.innerHTML = child_index + 1 + '/' + root_len;
            info.setAttribute('data-info', container.children[2].dataset.info);
            tip.style.opacity = container.children[2].tagName == 'IMG' ? 1 : 0;
            cooling = new Date().getTime() + 400;
            widthInde(container.children[2]);
            setTimeout(() => {
                container.style.transition = 'none';
                refersh(1);
                if (container.children[1].tagName == 'VIDEO') {
                    container.children[1].autoplay = true;
                    container.children[1].load()
                }
                if (container.children[0].tagName == 'VIDEO') {
                    container.children[0].pause();
                }
            }, 300);
        } else {
            container.style.transform = 'translateX(0px)';
        }
    }

    function widthInde(dom) {
        if (dom.width !== 0) {
            dom.style.margin = ((window.innerWidth * 0.98) - dom.width) / 2 / fontsize + 'rem';
        } else if (dom.tagName === 'VIDEO') {
            dom.style.margin = ((window.innerWidth * 0.98) - dom.clientWidth) / 2 / fontsize + 'rem';
        }
    }

    function refersh(v) {
        if (v < 0) {
            if (child_index <= 0) {
                container.children[2].remove();
                container.insertAdjacentElement('afterbegin', emptyE);
            } else {
                container.children[2].remove();
                container.insertAdjacentElement('afterbegin', loadmedia(root.children[child_index - 1]));
            }
        } else {
            if (child_index >= root_len - 1) {
                container.children[0].remove();
                container.insertAdjacentElement('beforeend', emptyE);
            } else {
                container.children[0].remove();
                container.insertAdjacentElement('beforeend', loadmedia(root.children[child_index + 1]));
            }
        }
    }

    function loadmedia(current) {
        const imgEl = current.children[0];
        const cnbUrl = imgEl.dataset.cnbUrl;
        if (current.classList.contains('video')) {
            const videoSrc = cnbUrl || ("/uploads/" + imgEl.dataset.url);
            const source = createElement({
                type: 'source',
                attributes: {
                    src: videoSrc,
                    type: 'video/mp4'
                }
            })
            const video = createElement({
                type: 'video', attributes: {
                    poster: imgEl.src,
                    controls: false
                }, children: [source]
            })
            video.setAttribute('data-info', imgEl.dataset.info)
            video.setAttribute('playsinline', '');
            video.setAttribute('x5-playsinline', '');
            tip.style.opacity = '(0)';
            video.onclick = () => {
                video.controls = true;
            }
            return video;
        } else {
            const picture = createElement({ type: 'img' })
            picture.src = cnbUrl || ("/uploads/" + imgEl.dataset.url);
            picture.dataset.info = imgEl.dataset.info;
            tip.style.opacity = '(1)';
            return picture;
        }
    }

    function getDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    //
    // 使用 WeakMap 存储图片的加载状态，避免重复处理
    const processedImages = new WeakMap();

    container.addEventListener('load', async (event) => {
        const img = event.target;
        if (img.tagName !== 'IMG' || !img.src.includes('Enc_') || processedImages.has(img)) {
            return;
        }

        processedImages.set(img, true); // 标记已处理

        try {
            const response = await fetch('/kernel/api.php', {
                method: "POST",
                body: new URLSearchParams({ api: 'login_status' })
            });
            const info = await response.json();
            if (info.code === 10200) {
                if (img.src.includes('Enc_')) {
                    img.classList.add('encry');
                }
                try {
                    //缩略图解码
                    let link = img.src;
                    if (getDomFromId('menu').dataset.c == 1) {
                        link = await get_img(img.src);
                    }
                    const imgSrc = await urlToBase64(link);
                    const decrypted = await decryptImage(imgSrc, localStorage.getItem('key'));
                    img.src = decrypted;
                    img.classList.remove('encry');
                } catch (error) {
                    showBubble('图片解密错误！', 'error')
                    console.error(error);
                }
            }
        } catch (e) {
        }
    }, true); // 捕获阶段
}

//============================================================================

//
function getDomFromId(str) {
    return document.getElementById(str);
}
//
function _btt() {
    backToTop.style.bottom = '-5rem';
    backToTop.style.pointerEvents = 'none';
}
//
function isIOS() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
}
//
function padZero(num) {
    return String(num).padStart(2, '0'); // 补齐到2位，不足补0
}
//
function isObject(value) {
    return value !== null && typeof value === 'object';
}

//回到屏幕顶部
function toWindowTop(offset = 0) {
    window.scrollTo({
        top: offset,
        behavior: "smooth",
    });
}

//清除地址栏的锚点
function clearAnchor() {
    setTimeout(() => {
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
    }, 10);
}

//清除地址栏的参数和锚点
function clearParams() {
    window.location.href = '/';
}

/**
 * 元素创建工厂
 * @param {Object} [options] 配置
 * @param {string} [options.type] 为元素添加属性
 * @param {Array} [options.attributes] 为元素添加属性
 * @param {Array} [options.children] 要为其添加的子元素
 * @param {String} [opions.innerText] 要为其添加的文本内容
 * @returns 返回一个新的元素
 */
function createElement(options) {
    const {
        type,
        attributes = {},
        children = [],
        innerText = ''
    } = options;

    const element = document.createElement(type);
    element.innerHTML = innerText;
    Object.assign(element, attributes);
    if (children) {
        children.forEach(child => element.appendChild(child));

    }
    return element;
}

/**
 * 无障碍键盘'Tab'导航
 * @param {Element} elem 需要设置无障碍导航的元素
 * @param {Boolean} bool 开启或关闭
 */
function tabIndexs(elem, bool) {
    value = bool == true ? 0 : -1;
    const children = elem.children;
    for (let i = 0; i < children.length; i++) {
        children[i].setAttribute("tabindex", value);
        children[i].disabled = !bool;
    }
}

/**
 * 在多种类名之间循环切换
 * @param {Element} element 需要切换类名的 DOM 元素
 * @param {...String} classNames 要循环切换的类名列表（至少传入2个）
 * @returns {String} 当前激活的类名
 */
function classNameSwitch(element, ...classNames) {
    if (classNames.length < 2) {
        throw new Error('至少需要提供两个类名进行切换');
    }

    // 找出当前激活的类名（在类列表中的）
    const currentClasses = Array.from(element.classList);
    const activeIndex = currentClasses.findIndex(cls => classNames.includes(cls));

    // 如果当前没有激活的类名或激活的类名不在列表中，默认使用第一个
    let nextIndex = 0;
    if (activeIndex !== -1) {
        // 获取当前激活的类名在列表中的位置
        const activeClass = currentClasses[activeIndex];
        const currentPos = classNames.indexOf(activeClass);

        // 计算下一个位置（循环）
        nextIndex = (currentPos + 1) % classNames.length;

        // 先移除当前类名
        element.classList.remove(activeClass);
    }

    // 添加下一个类名
    const nextClass = classNames[nextIndex];
    element.classList.add(nextClass);

    return nextClass;
}

/**
 * 一次性函数
 * @param {function} fn 要执行的操作
 * @returns function
 */
function once(fn) {
    let called = false;
    return function (...args) {
        if (!called) {
            called = true;
            return fn.apply(this, args);
        }
    };
}

/**
 * 设置CSS中的:root根变量
 * @param {String} variableName 变量名称
 * @param {String} value 值
 */
function setCssVariable(variableName, value) {
    const root = document.documentElement;
    root.style.setProperty(variableName, value);
}

/**
 * 显示或隐藏登录表单
 * @param {boolean} bool 选择是否显示
 */
function viewLoginForm(bool = true) {
    let a = "translate(-50%)";
    let b = "1";
    let c = "translateY(0%)";
    if (bool) {
        a = "translate(-50%,-5%)";
        b = "0";
        c = "translateY(50%)";
    }
    setCssVariable("--user-transform", a);
    setCssVariable("--sign-opacity", b);
    setCssVariable("--social-transform", c);
}

/**
 * 冻结元素使其暂时不可交互
 * @param {Element} dom 要冷却的元素
 * @param {Number} s 冷却毫秒 默认 500ms
 */
function coolingElement(dom, s = 500) {
    ElementDisable(dom, true)
    setTimeout(() => {
        ElementDisable(dom, false)
    }, s);
}

/**
 * 元素启用与禁用
 * @param {Element} elem DOM 元素
 * @param {boolean} disable true 禁用 flase 启用
 */
function ElementDisable(elem, disable) {
    if (disable) {
        elem.disabled = true;
        elem.style.pointerEvents = 'none';
        return;
    } else {
        elem.disabled = false;
        elem.style.pointerEvents = 'auto';
        return;
    }
}

/**
 * 切换密码框的密码显示隐藏
 * @param {Element} FormElement 登录表单的 DOM 元素
 * @returns 无返回值
 */
function inputViewPass(FormElement) {
    const input = FormElement.children[1]
    const eye = FormElement.children[0]
    if (input.type == "text") {
        input.type = "password";
        eye.className = 'icon-eye';
        input.focus()
        return;
    } else {
        input.type = "text";
        eye.className = 'icon-eye-blocked';
        input.focus()
        return;
    }
}

/**
 * 动态加载 CSS 和 JS 文件（按顺序，且仅执行一次）
 * @param {Array} resources 资源 URL 数组（支持 .css 和 .js）
 * @param {boolean} defer 是否对 JS 文件使用 defer（仅对 JS 生效）
 * @param {function} callback 所有资源加载完成后回调
 */
function loadResourcesInOrder(resources, defer = false, callback) {
    // 如果已经加载过，直接返回（避免重复执行）
    if (loadResourcesInOrder.hasLoaded) {
        callback && callback();
        return;
    }

    if (!resources.length) {
        loadResourcesInOrder.hasLoaded = true; // 标记为已加载
        callback && callback();
        return;
    }

    const url = resources.shift();
    if (typeof url !== 'string') {
        console.warn(`Invalid resource URL (must be string):`, url);
        loadResourcesInOrder(resources, defer, callback);
        return;
    }

    // 去掉查询参数（如 ?v=6.4）
    const urlWithoutQuery = url.split('?')[0];
    const isCSS = urlWithoutQuery.endsWith('.css');
    const isJS = urlWithoutQuery.endsWith('.js');

    if (isCSS) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url; // 仍然使用原始 URL（保留查询参数）
        link.onload = () => loadResourcesInOrder(resources, defer, callback);
        link.onerror = () => console.error(`Failed to load CSS: ${url}`);
        document.head.appendChild(link);
    } else if (isJS) {
        const script = document.createElement('script');
        script.src = url; // 仍然使用原始 URL
        script.defer = defer;
        script.onload = () => loadResourcesInOrder(resources, defer, callback);
        script.onerror = () => console.error(`Failed to load JS: ${url}`);

        const head = document.head;
        if (head.childNodes.length > 0) {
            const penultimateChild = head.childNodes[head.childNodes.length - 2];
            head.insertBefore(script, penultimateChild);
        } else {
            head.appendChild(script);
        }
    } else {
        console.warn(`Unsupported file type (skipping): ${url}`);
        loadResourcesInOrder(resources, defer, callback);
    }
}

// 初始化标记为 false（未加载）
loadResourcesInOrder.hasLoaded = false;

/**
     * 横向抖动效果
     * @param {HTMLElement} element - 要抖动的元素
     * @param {Object} [options] - 配置选项
     * @param {number} [options.duration=500] - 抖动持续时间(ms)
     * @param {number} [options.distance=10] - 抖动距离(px)
     * @param {number} [options.times=4] - 抖动次数
     */
function shakeElement(element, options = {}) {
    // 合并默认选项
    const { duration = 500, distance = 1, times = 4 } = options;

    // 保存原始 transform 和 transition
    const originalTransform = element.style.transform;
    const originalTransition = element.style.transition;

    // 设置 transition 以实现平滑动画
    element.style.transition = `transform ${duration / (times * 2)}ms ease-out`;

    // 执行抖动动画
    let currentTimes = 0;
    const maxTimes = times * 2; // 左右各 times 次

    function animate() {
        if (currentTimes >= maxTimes) {
            // 恢复原始状态
            element.style.transform = originalTransform;
            element.style.transition = originalTransition;
            return;
        }

        // 计算当前位移方向（奇数次向左，偶数次向右）
        const direction = currentTimes % 2 === 0 ? 1 : -1;
        element.style.transform = `translateX(${direction * distance}px)`;

        currentTimes++;
        setTimeout(animate, duration / maxTimes);
    }

    animate();
}


/**
 * 渐入渐出元素
 * @param {Element} dom 要渐入渐出的元素
 * @param {boolean} show true 显示 false 隐藏
 * @param {boolean} remove true 移除 false 不移除
 * @param {number} time 持续时间
 */
function ElementFade(dom, show, remove = false, time = 200) {
    // 确保元素有 CSS 过渡效果
    dom.style.transition = `opacity ${time}ms ease`;

    if (show) {
        // 淡入：取消 hidden，设置 opacity: 0 → 1
        dom.classList.remove('hidden');
        dom.style.opacity = '0'; // 强制初始透明
        // 强制重绘（触发过渡）
        void dom.offsetWidth;
        dom.style.opacity = '1';
    } else {
        // 淡出：设置 opacity: 1 → 0，结束后隐藏或移除
        dom.style.opacity = '1'; // 确保初始状态
        void dom.offsetWidth;
        dom.style.opacity = '0';

        const onTransitionEnd = () => {
            dom.classList.add('hidden');
            if (remove) dom.remove();
            dom.removeEventListener('transitionend', onTransitionEnd);
        };

        dom.addEventListener('transitionend', onTransitionEnd);
    }
}

/**
 * 事件监听中的高频请求去抖动
 * @param {Function} func 需要去抖动的函数
 * @param {number} delay 延迟时间（毫秒）
 * @returns 返回一个去抖动后的函数
 */
function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
/**
 * 显示气泡弹窗
 * @param {string} message - 要显示的消息
 * @param {string} style - 样式类型 (success, error, warning, info)
 * @param {number} timeout - 显示时间(毫秒)，0表示不自动关闭
 * @param {boolean} only - 只显示当前气泡，移除其他气泡
 */
function showBubble(message, style = 'info', timeout = 2000, only = false) {

    // 添加到容器
    let container = getDomFromId('bubble-container');

    // 检查容器是否存在
    if (!container) {
        container = document.createElement('div');
        container.id = 'bubble-container';
        document.body.insertAdjacentElement('afterbegin', container);
    }

    //清空容器中的气泡
    if (only) {
        container.replaceChildren();
    };

    // 创建弹窗元素
    const bubble = document.createElement('div');
    bubble.className = `bubble bubble-${style}`;

    // 添加消息内容
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    bubble.appendChild(messageSpan);

    bubble.addEventListener('click', () => _close(bubble));

    // 创建弹窗元素
    bubble.className = `bubble bubble-${style}`;
    container.appendChild(bubble);

    // 设置自动关闭
    if (timeout > 0) {
        setTimeout(() => _close(bubble), timeout);
    }

    /**
     * 关闭气泡弹窗
     * @param {HTMLElement} _b - 要关闭的弹窗元素
     */
    function _close(_b) {
        // 添加隐藏动画类
        _b.classList.add('hiding');

        // 动画结束后移除元素
        setTimeout(() => {
            if (_b.parentNode) {
                _b.parentNode.removeChild(_b);
            }
        }, 300); // 与CSS过渡时间匹配
    }
}

/**
 * 自动更新菜单位置
 */
function autoUpdateMenuPosition() {
    if (window.innerWidth > 880) {
        MenuPosition('pc');
        //pc
    } else {
        MenuPosition('m');
        //mobile
    }
    menu.style.display = 'flex';
}

/**
 * 菜单定位
 * @param {*} mode 'pc' 桌面模式
 */
function MenuPosition(mode) {
    const menu = getDomFromId('menu');
    const toolpanel = getDomFromId('tools');

    if (mode == 'pc') {
        document.querySelector('.userinfo').insertAdjacentElement('afterend', menu);
        if (toolpanel) {
            menu.insertAdjacentElement('afterend', toolpanel);
        }
    } else {
        document.getElementsByClassName('lower')[0].insertAdjacentElement('afterbegin', menu);
        if (toolpanel) {
            menu.insertAdjacentElement('afterend', toolpanel);
        }
    }
}

/**
 * DOM 元素到顶部
 * @param {Element} Element 需要移动到顶部的DOM元素
 */
function ElementToViewTop(Element, offset = 0) {
    Element.style.scrollMarginTop = offset + 'rem';
    Element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

/**
 * 创建菜单栏的三个工具面板
 * @param {string} classname 创建面板
 */
function createToolPanel(classname = '') {
    const menu = getDomFromId('menu');
    let panelChil = [];
    if (classname == '_search') {
        panelChil = seachPanel();
    } else if (classname == '_tags') {
        panelChil = tagsPanel();

    } else if (classname == '_calendar') {
        panelChil = createElement({
            type: 'form',
            attributes: {
                id: 'calendarPanel',
                className: 'calendarPanel',
            },
        })
    }
    const panel = createElement({ type: 'div', attributes: { className: 'panel' }, children: [panelChil] });
    const ToolPanel = createElement({
        type: 'div',
        attributes: { id: 'tools', className: classname },
        children: [panel]
    });

    menu.insertAdjacentElement('afterend', ToolPanel);
}

/**
 * 判断两个DOM元素是否重叠
 * @param {HTMLElement} element1 - 第一个DOM元素
 * @param {HTMLElement} element2 - 第二个DOM元素
 * @returns {boolean} - 如果元素重叠则返回true，否则返回false
 */
function ifElementOverlap(element1, element2, topOffset = 100, bottonOffset = 70) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    return !(
        rect1.bottom + bottonOffset < rect2.top ||
        rect1.top + topOffset > rect2.bottom
    );
}



/**
 * 创建下拉选择器
 * @param {Object} [options] - 配置选项
 * @param {Object} [options.select_attributes={}] - 配置下拉框的id，类名，
 * @param {Object} [options.button_attributes={}] - 配置下拉框的按钮 类名，文字
 * @param {boolean} [options.update_select_text=false] - 是否随选择更新按钮文字
 * @param {boolean} [options.item_active_disable=false] - 是否禁用下拉框选中状态
 * @param {Array<{item_id: string,item_text: string, item_html: string, item_value: string, item_active: boolean,item_disable: boolean,item_onlylogin: boolean}>} [options.select_items] - 配置选择器的选项列表
 * @param {string} [options.select_items[].item_id] - 选项ID
 * @param {string} [options.select_items[].item_text] - 选项显示的文本
 * @param {string} [options.select_items[].item_value] - 选项的值
 * @param {string} [options.select_items[].item_active=false] - 选项的选中状态
 * @param {string} [options.select_items[].item_disable=false] - 选项禁用
 * @param {string} [options.select_items[].item_needlogin=false] - 登录显示
 * @param {function} callback 当按钮按下时
 * @returns {HTMLElement} 返回创建的选择器容器元素
 */
function createSelection(options = {}, callback = () => { }) {
    const {
        select_attributes = {},
        button_attributes = {},
        button_height = '2rem',
        update_select_text = false,
        item_active_disable = false,
        select_items = [
            {
                item_id: '',
                item_text: '',
                item_html: '',
                item_value: '',
                item_active: false,
                item_disable: false,
                item_onlylogin: false
            }
        ]
    } = options;

    let select_Items = [];
    let btnNametemp, select_Value = '';
    let defaultValue = false;

    //get all item
    select_items.forEach((i) => {
        const item = createElement({
            type: 'button',
            attributes: {
                className: (i.item_active ? 'PopupItem PopupItemActive' : 'PopupItem'),
                innerHTML: i.item_html == null ? i.item_text : i.item_html,
                value: i.item_value,
                disabled: i.item_disable
            }
        })
        i.item_id ? item.id = i.item_id : '';
        if (i.item_active) {
            btnNametemp = i.item_html == null ? i.item_text : i.item_html;
            select_Value = i.item_value;
            defaultValue = true;
        }

        if (i.item_onlylogin) {
            get_fetch({
                api: 'login_status'
            }, info => {
                const Data = JSON.parse(info);
                if (Data.code === 10200) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            })
        }

        item.onclick = (e) => {
            _update(e.target);
            button.style.color = '#059be3';
            setTimeout(() => {
                callback(e.target.closest('.PopupItem').value);
            }, 0);
        }
        select_Items.push(item);
    })

    //create popup
    const popup = createElement({
        type: 'div',
        attributes: {
            className: 'Popup',
            tabIndex: 0
        },
        children: select_Items
    })

    //create button
    const button = createElement({ type: 'button' })
    if (btnNametemp !== '') {
        button.innerHTML = btnNametemp;
    }
    Object.assign(button, button_attributes);


    //create select
    const selectDom = createElement({
        type: 'button',
        attributes: {
            className: 'mySelection',
            value: select_Value,
            style: `grid-template-rows: ${button_height} 0fr`
        },
        children: [button, popup]
    })
    Object.assign(selectDom, select_attributes);


    selectDom.onclick = () => {
        ElementDisable(selectDom, true)
        setTimeout(() => {
            ElementDisable(selectDom, false)
            //fix ios
            popup.focus();
        }, 250);
        if (selectDom.style.gridTemplateRows == button_height + ' 0fr' || selectDom.style.gridTemplateRows == '') {
            selectDom.style.gridTemplateRows = button_height + ' 1fr';
            selectDom.style.paddingBottom = '4px';
            popup.style.display = 'flex';
            if (isIOS()) {
                // safari
                popup.addEventListener('focusout', () => {
                    setTimeout(() => {
                        _close();
                    }, 0);
                });
            } else {
                //other brower
                popup.addEventListener('blur', (e) => {
                    try {
                        if (!selectDom.contains(e.relatedTarget)) {
                            _close();
                        }
                    } catch (e) {
                        _close();
                    };
                }, { once: true })
            }
        } else {
            _close();
        }

        function _close() {
            setTimeout(() => {
                selectDom.style.gridTemplateRows = button_height + ' 0fr';
                selectDom.style.paddingBottom = '0px';
                ElementDisable(selectDom, true)
                setTimeout(() => {
                    ElementDisable(selectDom, false)
                    popup.style.display = 'none';
                }, 200);
            }, 200);
        }
    }

    //update status
    function _update(i) {
        if (update_select_text == true) {
            button.innerHTML = i.innerHTML == null ? i.innerText : i.innerHTML;
        }
        popup.childNodes.forEach(e => {
            if (e.className == 'PopupItem' && e == i) {
                e.className += item_active_disable ? '' : ' PopupItemActive';
                selectDom.value = i.value;
                active = true;
            } else {
                e.className = 'PopupItem';
            }
        });
    }

    //default active
    if (!defaultValue && update_select_text) {
        const firstChild = popup.childNodes[0];
        const secondChild = popup.childNodes[1];
        if (firstChild) {
            const _f = (firstChild.disabled && secondChild) ? secondChild : firstChild;
            selectDom.value = _f.value;
            _f.className += item_active_disable ? '' : ' PopupItemActive';
            if (btnNametemp == '') {
                button.innerHTML = _f.innerHTML == null ? _f.innerText : _f.innerHTML;
            }
        }
    }
    return selectDom;
}

/**
 * 根据日期获取对应的星期信息（中文简称或全称）
 *
 * @example
 * // 方式1：传入日期字符串和索引（0=周一，1=星期一）
 * getWeek("2025-02-01", 0); // 返回 "周六"（2025年2月1日是周六）
 * getWeek("2025/02/01", 1); // 返回 "星期六"
 *
 * // 方式2：传入年、月、日和索引（注意月份是0-based）
 * getWeek(2025, 1, 1, 0); // 返回 "周六"（2025年2月1日，月份1表示2月）
 *
 * @param {...(string|number)} arguments - 支持两种调用方式：
 *   1. (dateString: string, index: number)
 *      - dateString: 日期字符串（格式如 "YYYY-MM-DD" 或 "YYYY/MM/DD"）
 *      - index: 返回结果的索引（0=简称如"周一"，1=全称如"星期一"）
 *   2. (year: number, month: number, day: number, index: number)
 *      - year: 年份（如 2025）
 *      - month: 月份（0-based，0=1月，1=2月，...）
 *      - day: 日期（1-based）
 *      - index: 返回结果的索引
 *
 * @returns {string} 返回指定索引的星期中文字符串
 * @throws {Error} 如果日期解析失败或索引越界
 */
function getWeek() {
    const weekMap = new Map([['Mon', ['周一', '星期一']], ['Tue', ['周二', '星期二']], ['Wed', ['周三', '星期三']], ['Thu', ['周四', '星期四']], ['Fri', ['周五', '星期五']], ['Sat', ['周六', '星期六']], ['Sun', ['周日', '星期天']]])
    if (arguments.length === 2) {
        const ymd = getYMD(arguments[0]);
        return weekMap.get(new Date(ymd[0], ymd[1] - 1, ymd[2]).toString().slice(0, 3))[arguments[1]];
    } else if (arguments.length === 4) {
        return weekMap.get((new Date(arguments[0], arguments[1] - 1, arguments[2])).toString().slice(0, 3))[arguments[3]]
    }
}

/**
 * 字符串日期分解
 * @param {string} string [2025-01-01 12:04,2025/01/01 12:04,20250101 12:04]格式提取年月日
 * @returns {array} [YYYY,MM,DD hh:mm]
 */
function getYMD(string) {
    if (isObject(string)) {
        const dates = new Date(string)
        return [padZero(dates.getFullYear()), padZero(dates.getMonth()), padZero(dates.getDate()), padZero(dates.getHours()), padZero(dates.getMinutes())];
    } else {
        const dates = (/(\d{4})[-/]?(\d{2})[-/]?(\d{2})(?:\s?(\d{2}):(\d{2}))?/g).exec(string);
        return [dates[1], dates[2], dates[3], dates[4] || '00', dates[5] || '00'];
    }
}

/**
 *
 * @param {string} id 日历面板ID
 * @param {string} yyyy 年
 * @param {string} mm 月
 * @param {string} dd 日
 * @param {function} callback 回调处理函数
 * @returns 日历视图
 */
function calendarPanel(id, yyyy, mm, dd, callback) {
    const now_date = new Date();
    let calendarPanelDom = getDomFromId(id);
    calendarPanelDom.innerHTML = '';

    const sun = createElement({ type: 'div', attributes: { innerText: '日' } });
    const mon = createElement({ type: 'div', attributes: { innerText: '一' } });
    const tue = createElement({ type: 'div', attributes: { innerText: '二' } });
    const wed = createElement({ type: 'div', attributes: { innerText: '三' } });
    const thu = createElement({ type: 'div', attributes: { innerText: '四' } });
    const fri = createElement({ type: 'div', attributes: { innerText: '五' } });
    const sat = createElement({ type: 'div', attributes: { innerText: '六' } });

    const calendarHeader = createElement({
        type: 'div',
        attributes: {
            className: 'calendar-header'
        },
        children: [sun, mon, tue, wed, thu, fri, sat]
    });
    const calendarGrid = createElement({
        type: 'div',
        attributes: {
            className: 'calendar-grid',
            id: 'calendar-grid'
        }
    });

    const calendarView = createElement({
        type: 'div',
        attributes: {
            className: 'calendarView'
        },
        children: [calendarHeader, calendarGrid]
    });

    const yearArry = [];
    const nowYear = now_date.getFullYear();
    year_view().forEach(year => {
        yearArry.push({
            item_text: `${year}年`,
            item_value: padZero(year),
            item_active: yyyy == year
        })
    });


    const yearSelect = createSelection({
        select_attributes: {
            id: 'calendarYear',
            className: 'mySelection',
            value: yyyy
        },
        button_attributes: {
            className: 'mybutton dark icon-expand',
            innerText: yyyy + '年'
        },
        update_select_text: true,
        select_items: yearArry
    }, (y) => {
        setTimeout(() => {
            mm = month_view(y).includes(mm) ? mm : month_view(y)[0];
            calendarPanel(id, y, mm, 99, callback)
        }, 50);
    })

    const monthArry = [];
    const nowMonth = now_date.getMonth() + 1;
    for (let i = 1; i <= 12; i++) {
        monthArry.push({
            item_text: `${i}月`,
            item_value: padZero(i),
            item_active: mm == i,
            item_disable: true
        })
    }

    const monthSelect = createSelection({
        select_attributes: {
            id: 'calendarMonth',
            className: 'mySelection select_right',
            value: mm
        },
        button_attributes: {
            className: 'mybutton dark icon-expand',
            innerText: mm + '月'
        },
        update_select_text: true,
        select_items: monthArry
    }, (e) => {
        setTimeout(() => {
            calendarPanel(id, yyyy, e, 99, callback);
        }, 50);
    })

    const tip = createElement({
        type: 'span',
        attributes: {
            className: 'select_left icon-calendar',
            innerText: '跳转到:'
        }
    })
    tip.addEventListener('click', () => {
        calendarPanel(id, nowYear, padZero(nowMonth), 99, callback);
    })


    monthSelect.addEventListener('click', () => {
        refershMonth(yearSelect.value);
    })

    calendarGrid.addEventListener('click', (e) => {
        if (e.target.innerText != '' && e.target.tagName == 'BUTTON') {
            typeof callback === "function" ? setTimeout(() => { callback(`${yyyy}-${mm}-${padZero(e.target.innerText)}`); }, 50) : '';
        }
    })

    const c_tool = createElement({
        type: 'div',
        attributes: {
            className: 'calendarTool'
        },
        children: [tip, yearSelect, monthSelect]
    })

    calendarPanelDom.appendChild(c_tool);
    calendarPanelDom.appendChild(calendarView);

    createCalendar(`${yyyy}-${mm}-${dd}`, yyyy, mm, dd);
    calendarPanelDom.dataset.value = `${yyyy}-${mm}-${dd}`;

    function refershMonth(y) {
        const Data = month_view(y);
        const dom = getDomFromId('calendarMonth').querySelector('.Popup');
        Data.forEach(m => {
            dom.children[parseInt(m) - 1].removeAttribute('disabled');
        });
    }
    return
}

function year_view() {
    const array = JSON.parse(sessionStorage.getItem('calendar'));
    const YearList = Object.keys(array).map(Number).sort((a, b) => b - a);
    return YearList;
}

function month_view(y) {
    const array = JSON.parse(sessionStorage.getItem('calendar'));
    return array[y];
}

function get_yearmonth(callback) {
    get_fetch({
        api: 'calendar_post_num',
    }, data => {
        sessionStorage.setItem('calendar', data);
        typeof callback == 'function' ? callback() : '';
    })
}

/**
 * 时间是否有效
 * @param {string} timeStr 时间字符串
 * @returns 1未来时间，0当前时间，-1过去时间,false非法时间
 */
function isDate(timeStr) {
    const inputDate = new Date(timeStr);
    if (isNaN(inputDate.getTime())) {
        return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(timeStr)) {
        return false;
    }
    const now = new Date();
    if (inputDate > now) {
        return 1;
    } else if (inputDate < now) {
        return -1;
    } else {
        return 0;
    }
}

/**
 * 日历视图创建更新
 * @param {Object || string} PrevDate 必要的上一个操作日期
 * @param {string} currentY 四位日期
 * @param {string} currentM 两位日期
 * @param {string} currentD 两位日期
 */
function createCalendar(PrevDate, currentY, currentM, currentD) {
    const firstDay = new Date(currentY, currentM - 1, 1);
    const lastDay = new Date(currentY, currentM, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const calendarGrid = getDomFromId('calendar-grid');
    calendarGrid.dataset.value = currentY + '-' + currentM;
    calendarGrid.innerHTML = '';

    let dayCount = 1;
    for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
            const dayElement = document.createElement('button');
            dayElement.className = 'calendar-day';
            dayElement.setAttribute('disabled', true);

            if (week === 0 && day < startDay) {
                dayElement.className += ' empty';
                dayElement.style.pointerEvents = 'none';
            } else if (dayCount > daysInMonth) {
                dayElement.className += ' empty';
                dayElement.style.pointerEvents = 'none';
            } else {
                dayElement.textContent = dayCount;

                //判断是激活
                const date = getYMD(PrevDate);
                if (padZero(dayCount) == padZero(currentD) && currentY == padZero(date[0]) && currentM == padZero(date[1])) {
                    dayElement.className += ' current_day';
                }
                //判断是当天
                const currdate = getYMD(new Date());
                if (padZero(dayCount) == padZero(currdate[2]) && currentY == padZero(currdate[0]) && currentM == padZero(currdate[1] - 1 + 2)) {
                    dayElement.className += ' today';
                }
                dayCount++;
            }
            calendarGrid.appendChild(dayElement);
        }
    }

    let post_date = calendarGrid.dataset.value.replace(/-/g, "");
    let _t = 0;
    if (blocked > 0) {
        const _d = new Date();
        _ym = _d.getFullYear() + padZero(_d.getMonth());
        _d.setDate(_d.getDate() - 30);
        if (post_date <= _ym) {
            _t = _d.toISOString().split('T')[0].split('-')[2];
        }
    }
    //get num
    const calendar_fetch = new myFetch();
    calendar_fetch.fetch('/kernel/api.php', {
        method: 'POST',
        body: new URLSearchParams({
            api: 'calendar_post_num',
            date: post_date,
            mode: 'D'
        })
    })
        .then(response => {
            return response.json();
        })
        .then(data => {
            if (data.length == 0) {
                return;
            }

            const _data = JSON.parse(data[0]);
            if (_data.code === 10401) {
                updateLoginStatus();
                return;
            }
            const days = calendarGrid.childNodes;
            let i = 1;
            days.forEach(item => {
                if (!item.classList.contains('empty')) {
                    if (_t > 0) {
                        if (_data[i] > 0 && i > _t) {
                            item.removeAttribute('disabled');
                        }
                    } else {
                        if (_data[i] > 0) {
                            item.removeAttribute('disabled');
                        }
                    }
                    i++;
                }
            });
        })
}



const MDate = new Date();
MDate.setMonth(MDate.getMonth() + 1);

/**
* 桌面端单独渲染日历视图
*/
function pcCalendar(value) {
    const isPc = window.innerWidth > 880 ? true : false;
    if (isPc) {
        const header = document.querySelector('header');
        const _date = value ?? MDate;
        const calendarDom = createElement({
            type: 'form',
            attributes: {
                id: 'calendarPanelPC',
                className: 'calendarPanel'
            }
        })
        if (!getDomFromId('calendarPanelPC')) {
            header.insertAdjacentElement('beforeend', calendarDom)
        }

        calendarPanel('calendarPanelPC', getYMD(_date)[0], getYMD(_date)[1], getYMD(_date)[2], (value) => {
            pcCalendar(value);
            searchValue.page = 0;
            searchValue.sort = 2;
            dateSelect = true;
            getDomFromId('calendarPanelPC').dataset.value = value;
            let _current = getYMD(_date)[0] + '-' + padZero((getYMD(_date)[1])) + '-' + getYMD(_date)[2];
            if (_current == value) {
                dateSelect = false;
                value = '';
                resSearchValue();
            }
            loadPostList({ date: value, page: searchValue.page, sort: searchValue.sort })
        })
    } else {
        try { getDomFromId('calendarPanelPC').remove(); } catch (e) { }
    }
}

/**
 * 标签面板
 * @returns tags panel dom
 */
function tagsPanel() {

    const sort = createSelection({
        select_attributes: {
            id: 'select_search_sort',
            className: 'mySelection select_left_tags'
        },
        button_attributes: {
            className: 'mybutton dark icon-sort icon-expand',
            innerText: '排序规则'
        },
        update_select_text: true,
        select_items: [
            {
                item_text: '[a-Z]升序',
                item_value: 0,
            }, {
                item_text: '[Z-a]降序',
                item_value: 1
            }, {
                item_text: '[0-9]升序',
                item_value: 3
            }, {
                item_text: '[9-0]降序',
                item_value: 2
            }, {
                item_text: '隐藏优先',
                item_value: 4,
                item_onlylogin: true
            }
        ]
    }, (e) => {
        tags_view(e);
    });

    const input = createElement({
        type: 'input',
        attributes: {
            id: 'tagsSearch',
            type: 'text',
            placeholder: '手动查询'
        }
    })

    const search = createElement({
        type: 'form',
        attributes: {
            className: 'filter_search'
        },
        children: [input]
    })

    const tools = createElement({
        type: 'div',
        attributes: {
            className: 'tagTool'
        },
        children: [sort, search]
    });

    const tags = document.createElement('div');

    const tagspanel = createElement({
        type: 'form',
        attributes: {
            className: 'tagsPanel',
        },
        children: [tools, tags]
    })

    const filter_tag = createElement({ type: 'span', attributes: { id: 'filterTag', className: 'tag icon-topic' } })

    tags_view(0);
    function tags_view(sort) {
        let TagsList = JSON.parse(sessionStorage.getItem('tagsList'));
        switch (sort) {
            case '0':
                TagsList = TagsList.sort((a, b) => a[0].localeCompare(b[0]));
                break;
            case '1':
                TagsList = TagsList.sort((a, b) => b[0].localeCompare(a[0]));
                break;
            case '2':
                TagsList = TagsList.sort((a, b) => b[3] - a[3]);
                break;
            case '3':
                TagsList = TagsList.sort((a, b) => a[3] - b[3]);
                break;
            case '4':
                TagsList = TagsList.sort((a, b) => b[1] - a[1]);
                break;
        }
        let tagslist = '';
        TagsList.forEach(item => {
            tagslist += `<button id='${item[0]}' class='mybutton tagsPanelTag icon-topic${item[1] == 1 ? " tag_hidden" : ''}' data-id='${item[2]}'>${item[0]}<span>(${item[3]})</span></button>`;
        })
        tags.replaceChildren();
        tags.insertAdjacentHTML('beforeend', tagslist);
    }

    tagspanel.onclick = (e) => {
        let value = e.target.cloneNode(true);
        if (e.target.classList.contains('tagsPanelTag')) {
            searchValue.page = 0;
            searchValue.sort = 0;
            value.children[0].remove();
            if (document.querySelector('.filter').lastChild.innerText == value.innerText) {
                getDomFromId('filterTag').remove();
                getDomFromId('tags_B').click();
                searchValue.tag = -1;
                loadPostList({ tag: searchValue.tag, page: searchValue.page });
                return;
            }
            try {
                getDomFromId('filterTag').remove();
            } catch (e) { }
            filter_tag.innerText = value.innerText;
            filter_tag.dataset.tagid = value.dataset.id;
            searchValue.tag = value.dataset.id;
            document.querySelector('.filter').insertAdjacentElement('beforeend', filter_tag);
            filter_tag.onclick = () => {
                ElementFade(filter_tag, false, true);
                searchValue.tag = -1;
                searchValue.page = 0;
                searchValue.sort = 0;
                loadPostList({ tag: searchValue.tag, page: searchValue.page })
            }
            loadPostList({ tag: searchValue.tag = value.dataset.id, page: searchValue.page });
            getDomFromId('tags_B').click();
        }
    }

    input.onkeydown = (e) => {
        if (e.key == 'Enter' && e.target.value !== '') {
            location.href = '#' + e.target.value;
            if (document.activeElement === input) {
                e.target.value = '';
                e.target.placeholder = '没有找到';
                clearAnchor();
                setTimeout(() => {
                    e.target.placeholder = '定位标签';
                }, 1000);
            } else {
                clearAnchor();
            }
        }
    }

    sort.addEventListener('click', (e) => {
        if (e.target.classList.contains('PopupItem')) {
            get_tags();
        }
    })

    return tagspanel;
}

function get_tags(sort = 0, callback) {
    get_fetch({
        api: 'tags_all',
        sort: sort
    }, data => {
        const result = JSON.parse(data);
        let tagslist = [];
        result.forEach(item => {
            tagslist.push([item['tag'], item['hidden'], item['id'], item['count']]);
        })
        sessionStorage.setItem('tagsList', JSON.stringify(tagslist));
        (typeof callback === 'function' && callback(tagslist)) ?? '';
    })
}

/**
 * 清除搜索缓存
 */

function resSearchValue() {
    if (getDomFromId('filterTag')) {
        getDomFromId('filterTag').remove();
    }
    searchValue.id = null;
    searchValue.search = '';
    searchValue.date_range = [];
    searchValue.date = '';
    searchValue.sort = 0;
    searchValue.tag = -1;
    searchValue.mode = 0;
    searchValue.page = 0;
}

/**
 * 搜索面板
 * @returns search panel dom
 */
function seachPanel() {
    let _h = false;
    if (searchValue.search == '' && searchValue.sort == 0 && searchValue.mode == '' && searchValue.date_range.length == 0) {
        _h = true;
    }
    searchValue.sort = dateSelect ? 0 : searchValue.sort;
    sortASC = false;
    const sort = createSelection({
        select_attributes: {
            id: 'select_search_sort',
            className: 'mySelection select_left'
        },
        button_attributes: {
            className: 'mybutton dark icon-sort icon-expand',
            innerText: _h ? '排序规则' : ['默认排序', '新的内容', '旧的内容', '隐藏优先', '只看归档'][searchValue.sort]
        },
        update_select_text: true,
        select_active_disable: false,
        select_items: [
            {
                item_text: '默认排序',
                item_value: 0,
                item_active: searchValue.sort == 0 ? true : false
            }, {
                item_text: '隐藏优先',
                item_value: 3,
                item_active: searchValue.sort == 3 ? true : false,
                item_onlylogin: true
            }, {
                item_text: '只看归档',
                item_value: 4,
                item_active: searchValue.sort == 4 ? true : false,
                item_onlylogin: true
            }, {
                item_text: '新的内容',
                item_value: 1,
                item_active: searchValue.sort == 1 ? true : false
            }, {
                item_text: '旧的内容',
                item_value: 2,
                item_active: searchValue.sort == 2 ? true : false
            }
        ]
    }, (e) => {
        if (e == 4 || e == 3) {
            getDomFromId('searchSubmit').click();
        }
    });

    const mode = createSelection({
        select_attributes: {
            id: 'select_search_mode',
            className: 'mySelection select_right'
        },
        button_attributes: {
            className: 'mybutton dark icon-search icon-expand',
            innerText: _h ? '匹配模式' : ['模糊匹配', '融合匹配'][searchValue.mode]
        },
        update_select_text: true,
        select_items: [
            {
                item_text: '模糊匹配',
                item_value: 0,
                item_active: searchValue.mode == 0 ? true : false
            }
            ,
            {
                item_text: '融合匹配',
                item_value: 1,
                item_active: searchValue.mode == 1 ? true : false
            }
        ]
    });


    mode.addEventListener('click', (e) => {
        const tip = createElement({
            type: 'span',
            attributes: {
                id: 'tip',
                innerHTML: '多关键词用" , "半角逗号进行分割',
            }
        })

        if (e.target.value == 1) {
            searchtool.insertAdjacentElement('beforebegin', tip);
        } else {
            try { getDomFromId('tip').remove(); } catch (e) { };
        }

    })

    const range = createSelection({
        select_attributes: {
            id: 'select_search_range',
            className: 'mySelection'
        },
        button_attributes: {
            innerText: '区间搜索',
            className: 'mybutton dark icon-calendar icon-expand'
        },
        update_select_text: false,
        item_active_disable: true,
        select_items: [
            {
                item_id: 'range_start',
                item_html: `起始日期</br>${searchValue.date_range[0] == null ? '(最早)' : searchValue.date_range[0]}`,
                item_value: searchValue.date_range[0] ?? ''
            },
            {
                item_id: 'range_end',
                item_html: `结束日期</br>${searchValue.date_range[1] == null ? '(今天)' : searchValue.date_range[1]}`,
                item_value: searchValue.date_range[1] ?? ''
            }
        ]
    })

    const input = createElement({
        type: 'input',
        attributes: {
            type: 'text',
            id: 'searchInput',
            placeholder: 'search...',
            autocomplete: 'off',
            value: searchValue.search
        }
    })

    const submit = createElement({
        type: 'input',
        attributes: {
            type: 'submit',
            id: 'searchSubmit',
            value: 'Search',
            className: 'mybutton dark'
        }
    })

    const searchtool = createElement({
        type: 'div',
        attributes: {
            className: 'searchTool',
        },
        children: [sort, range, mode]
    })

    const searchPanel = createElement({
        type: 'form',
        attributes: {
            className: 'searchPanel'
        },
        children: [input, submit, searchtool]
    })

    submit.onclick = () => {
        const filtertag = getDomFromId('filterTag');
        const start = getDomFromId('range_start');
        const end = getDomFromId('range_end');
        if (input.value == '' && sort.value == 0 && start.value == '' && end.value == '') {
            return;
        }
        searchValue.page = 0;
        searchValue.sort = 0;
        loadPostList({
            search: input.value,
            sort: sort.value,
            mode: mode.value,
            date_range: [start.value, end.value],
            tag: searchValue.tag,
            page: searchValue.page
        })

        searchValue.search = input.value;
        if (sort.value) {
            searchValue.sort = parseInt(sort.value);
        }
        if (mode.value) {
            searchValue.mode = parseInt(mode.value);
        }
        if (start.value) {
            searchValue.date_range[0] = start.value;
        }
        if (end.value) {
            searchValue.date_range[1] = end.value;
        }
        searchValue.tag = filtertag == null ? -1 : filtertag.dataset.tagid;

        //close
        const search_B = getDomFromId('search_B');
        const _t_p = getDomFromId('tools');
        if (searchValue.search !== '' || searchValue.sort !== 0 || searchValue.date_range.length !== 0 || searchValue.mode !== 0) {
            if (search_B.classList.contains('icon-close')) {
                classNameSwitch(search_B, 'icon-search', 'icon-close');
            } else {
                classNameSwitch(search_B, 'icon-search', 'icon-clear');
            }
            search_B.style.color = '#03a9f4';
        } else {
            classNameSwitch(search_B, 'icon-search', 'icon-clear');
            resSearchValue();
            search_B.style.color = '#39393A';
        }
        _t_p.style.overflow = 'hidden';
        _t_p.style.gridTemplateRows = '0fr';
        setTimeout(() => {
            _t_p.style.display = 'none';
            _t_p ? _t_p.remove() : '';
        }, 300);

    }

    range.addEventListener('click', (e) => {
        const date = new Date();
        const searchCalendar = getDomFromId('searchCalendar');
        const searchPanel = document.querySelector('.searchPanel');
        const end = getDomFromId('range_end');
        const start = getDomFromId('range_start');

        if (e.target.classList.contains('PopupItem')) {
            const dom = e.target;
            const calendar = createElement({
                type: 'div',
                attributes: {
                    id: 'searchCalendar',
                    className: 'searchCalendar'
                }
            })
            try {
                searchCalendar.remove();
                searchPanel.appendChild(calendar);
            } catch (e) {
                searchPanel.appendChild(calendar);
            }

            if (dom.innerText.includes('起始日期')) {
                calendarPanel('searchCalendar', date.getFullYear(), padZero(date.getMonth() + 1), padZero(date.getDate()), (_date) => {
                    if (end.value == '' || _date <= end.value) {
                        getDomFromId('searchCalendar').remove();
                        range.click();
                        if (_date) {
                            start.value = _date;
                            searchValue.date_range[0] = _date;
                            start.innerHTML = '起始日期</br>' + _date;
                        }
                    } else {
                        showBubble('起始日期必须小于' + end.value, 'error')
                    }
                })
            } else if (dom.innerText.includes('结束日期')) {
                calendarPanel('searchCalendar', date.getFullYear(), padZero(date.getMonth() + 1), padZero(date.getDate()), (_date) => {
                    if (start.value == '' || start.value <= _date) {
                        getDomFromId('searchCalendar').remove();
                        range.click();
                        if (_date) {
                            end.value = _date;
                            searchValue.date_range[1] = _date;
                            end.innerHTML = '结束日期</br>' + _date;
                        }
                    } else {
                        showBubble('结束日期必须大于' + start.value, 'error')
                    }
                })
            }
        } else {
            try {
                searchCalendar.remove();
            } catch (e) { };
        }
    })
    return searchPanel;
}

/**
 * 检查模块是否出现在视图中（支持偏移量）
 * @param {HTMLElement} dom - 要检查的DOM元素
 * @param {number} [offset=0] - 触发偏移量（像素），正数表示提前触发，负数表示延迟触发
 */
function checkVisibility(dom, offset = 0) {
    if (dom == null) return;
    if (isTriggered) return;

    const rect = dom.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // 应用偏移量：提前或延迟触发
    const adjustedTop = rect.top - offset;
    const adjustedBottom = rect.bottom + offset;

    const isInViewport = (
        adjustedTop <= viewportHeight && // 元素顶部（调整后） <= 视口高度
        adjustedBottom >= 0              // 元素底部（调整后） >= 0
    );
    if (isInViewport) {
        isTriggered = true;
        loadPostList({ page: ++searchValue.page, sort: searchValue.sort })
    }
}

/**
 * 加载内容
 * @param {Object} [options] - 配置
 * @param {string} [options.id] - 搜索id
 * @param {string} [options.search] - 搜索关键词
 * @param {number} [options.sort] - 排序方式
 * @param {Array} [options.sort] - 日期范围
 * @param {string} [options.date] - 日期
 * @param {number} [options.tag] - 标签
 * @param {number} [options.mode] - 匹配模式
 * @param {number} [options.page] - 请求页数
 */
async function loadPostList(options, first = false) {
    const {
        id = searchValue.id,
        search = searchValue.search,
        sort = searchValue.sort,
        date_range = searchValue.date_range,
        date = searchValue.date,
        tag = searchValue.tag,
        mode = searchValue.mode,
        page = searchValue.page
    } = typeof options === 'object' && options !== null ? options : {};

    if (date !== '') {
        // resSearchValue();
        getDomFromId('search_B').style.color = '#39393A';
    }

    const loading = createElement({
        type: 'div',
        attributes: {
            className: 'loading2',
        }
    })

    if (!first && page == 0) {
        document.querySelector('main').appendChild(loading);
    }

    let PostDOMList = [];
    const login_status = await fetch('/kernel/api.php', {
        method: "POST",
        body: new URLSearchParams({
            api: 'login_status'
        })
    }).then(response => response.json()
    ).then(info => {
        return info.code;
    })
    //创建 DOMParser 实例
    const parser = new DOMParser();
    const Content_fetch = new myFetch();
    Content_fetch.fetch('/kernel/api.php', {
        method: 'POST',
        body: new URLSearchParams({
            api: 'get_post',
            id: id,
            search: search,
            sort: sort,
            date_range: JSON.stringify(date_range),
            date: date,
            tag: tag,
            mode: mode,
            page: page
        })
    })
        .then(response => response.text())
        .then(async data => {
            const Data = JSON.parse(data);
            _up = Data['pagination']['has_previous'];
            _down = Data['pagination']['has_next'];
            blocked = Data['pagination']['avg'];
            if (_up == false) {
                document.querySelector('main').innerHTML = '';
                date_temp = '';
            }

            for (const item of Data['data']) {
                await processItem(item);
            }

            async function processItem(item) {
                _date = new Date();
                _date = getYMD(item.date)[0] + "-" + getYMD(item.date)[1];
                if (date_temp != _date) {
                    const date = `
                        <div class="date">
                            <button class="mybutton dark"><i class="icon-calendar"></i>&nbsp;${_date}</button>
                        </div>
                    `;
                    const datedom = parser.parseFromString(date, 'text/html').body.firstChild;
                    index == 0 ? '' : PostDOMList.push(datedom);
                }

                let pics = '';
                const dir = JSON.parse(item.pics);
                let piclen = 0;
                if (JSON.stringify(dir) !== '{}') {
                    const _media = JSON.parse(item.pics).media;
                    _media.forEach(pic => {
                        piclen++;
                        let _num = '';
                        if (piclen == 9 && _media.length - 9 > 0) {
                            _num = `<span>剩余${_media.length - 9}张</span>`;
                        }
                        if (pic.url) {
                            const isVideo = pic.url.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)(\?|$)/i);
                            pics += `<div class="${isVideo ? 'video' : 'image'}${(piclen == 9 && _media.length > 9) ? ' more' : (piclen > 9 ? ' annexh' : '')}"><img loading="lazy" decoding="async" src="${pic.url}" data-url="${pic.url}" data-cnb-url="${pic.url}" data-source-name="${pic.name || ''}" data-info='${pic.alt || '[]'}' onerror="this.src='/kernel/asset/img/default-image.webp'; this.onerror=null;" alt="${pic.name || ''}">${_num}</div>`;
                        } else {
                            const origFile = "/" + pic[0] + "." + pic[1];
                            const isGif = origFile.endsWith('GIF.webp');
                            const thumbSrc = isGif ? "/uploads/" + dir.dir + origFile : "/uploads/" + dir.dir + "/thum-" + pic[0] + ".webp";
                            pics += `<div class="${isGif ? 'gif' : getSupportFormat(pic[1])}${(piclen == 9 && _media.length > 9) ? ' more' : (piclen > 9 ? ' annexh' : '')}${pic[0].includes('Enc') ? ' enc' : ''}"><img loading="lazy" decoding="async" src="${thumbSrc}" data-url="${dir.dir + '/' + pic[0] + '.' + pic[1]}" data-info='${pic[2]}' onerror="this.src='/kernel/asset/img/default-image.webp'; this.onerror=null;" alt="${JSON.parse(pic[2])[0][1]}">${_num}</div>`;
                        }
                    });
                    piclen = 0;
                }

                const map = new Map([[1, 'province'], [2, 'city'], [3, 'district']])
                const _mode = getDomFromId('menu').dataset.l.toString().split('').map(Number);
                let location = '';
                _mode.forEach(i => {
                    location += JSON.parse(item.location)[map.get(i)] + ' ';
                });

                const weather = JSON.parse(item.weather);
                
                // 检测内容是否为Markdown格式并渲染
                let renderedContent = item.content;
                const isMd = typeof isMarkdownContent === 'function' && isMarkdownContent(item.content);
                if (isMd) {
                    try {
                        renderedContent = renderMarkdown(item.content);
                        // 添加Markdown标识类
                        if (!renderedContent.includes('class="markdown-body"')) {
                            renderedContent = '<div class="markdown-body">' + renderedContent + '</div>';
                        }
                    } catch (e) {
                        console.warn('Markdown渲染失败，使用原始内容:', e);
                        renderedContent = '<div class="markdown-body">' + item.content + '</div>';
                    }
                }
                
                const html = `
                    <div class="post${item.hidden == 1 ? (item.is_hidden == 1 ? '' : ' post_hidden') : ''} ${item.pin ? ' post_pin' : ''}" tabindex="0" data-id="${item.id}" data-i="${index++}">
                        <div class="title">
                            <h1 ${item.hidden == 1 ? 'style="display:none"' : ''}>${item.title}${login_status === 10200 ? `<span class='Revise'></span>` : ''}</h1>
                        </div>
                        <div class="content" ${item.hidden == 1 ? 'style="display:none"' : ''} ${isMd ? 'data-raw-markdown="' + item.content.replace(/"/g, '&quot;') + '"' : ''}><span class="tag icon-topic">${item.tag}</span>${renderedContent}</div>
                        <div class="annex">
                            ${pics}
                        </div>
                        <div class="meta">
                            <span class="weather">
                                <div class="weather_${weather.icon}" data-title="${weather.name == 'null' ? weatherMap[weather.icon] : weather.name}${weather.temp == 0 ? '' : ' ' + weather.temp + '°'}" ${weather.icon == '000' ? 'style="display:none"' : ''}></div>
                            </span>
                            <span>
                                ${location}
                            </span>
                            <span>
                                <div class="date2">${getYMD(item.date)[0]}-${getYMD(item.date)[1]}-${getYMD(item.date)[2]}</div><span>${getYMD(item.date)[3]}:${getYMD(item.date)[4]}</span>
                            </span>
                            ${item.hidden == 1 ? '' : "<span onclick='share(" + item.id + ",this)' class='icon-share'></span>"}
                        </div>
                    </div>
                `;
                const _doc = parser.parseFromString(html, 'text/html').body.firstChild;

                setTimeout(async () => {
                    const h1 = _doc.querySelector('h1');
                    const content = _doc.querySelector('.content');
                    if (login_status !== 10200) return;
                    if (h1.innerText.includes('Encryption=')) {
                        const span = h1.querySelector('span');
                        h1.innerText = await DecryptText(h1.innerText);
                        if (span) h1.appendChild(span);
                        h1.style.display = 'block';
                        foldPost(h1);
                    }
                    const span = content.children[0];
                    if (content.innerText.includes('Encryption=')) {
                        content.children[0].remove();
                        let decryptedContent = await DecryptText(content.innerText);
                        
                        // 保存解密后的原始内容（用于编辑恢复）
                        const originalDecrypted = decryptedContent;
                        
                        // 检测解密后的内容是否为Markdown格式
                        if (typeof isMarkdownContent === 'function' && isMarkdownContent(decryptedContent)) {
                            try {
                                decryptedContent = renderMarkdown(decryptedContent);
                                if (!decryptedContent.includes('class="markdown-body"')) {
                                    decryptedContent = '<div class="markdown-body">' + decryptedContent + '</div>';
                                }
                                // 保存到全局存储
                                if (window._markdownRawStore) {
                                    window._markdownRawStore.set(content, originalDecrypted);
                                }
                            } catch (e) {
                                console.warn('Markdown渲染失败（解密内容）:', e);
                            }
                        }
                        
                        content.innerHTML = decryptedContent;
                        if (span) content.insertAdjacentElement('afterBegin', span);
                        content.style.display = 'block';
                        foldPost(content);
                    } else {
                        // 非加密内容也需要检查是否为Markdown
                        const rawContent = content.innerHTML;
                        const plainText = getPlainText ? getPlainText(rawContent) : rawContent;
                        if (typeof isMarkdownContent === 'function' && isMarkdownContent(plainText)) {
                            try {
                                // 保留tag标签
                                const tagSpan = content.querySelector('.tag');
                                let mdContent = renderMarkdown(plainText);
                                if (!mdContent.includes('class="markdown-body"')) {
                                    mdContent = '<div class="markdown-body">' + mdContent + '</div>';
                                }
                                
                                // 保存原始 Markdown 到全局存储
                                if (window._markdownRawStore) {
                                    window._markdownRawStore.set(content, plainText);
                                }
                                
                                content.innerHTML = '';
                                if (tagSpan) content.appendChild(tagSpan);
                                content.insertAdjacentHTML('beforeend', mdContent);
                                
                                // 重要：Markdown 渲染后需要重新检查是否需要折叠
                                setTimeout(() => {
                                    content.style.maxHeight = '';
                                    foldPost(content);
                                }, 50);
                            } catch (e) {
                                console.warn('Markdown渲染失败（普通内容）:', e);
                            }
                        }
                    }
                }, 100);

                PostDOMList.push(_doc);
                if (_date) {
                    date_temp = _date;
                }

                _doc.querySelector('.annex').querySelectorAll('img').forEach(async img => {
                    if (img.src.includes('thum-Enc') && login_status === 10200) {
                        try {
                            //缩略图解码
                            let link = img.src;
                            if (getDomFromId('menu').dataset.c == 1) {
                                link = await get_img(img.src);
                            }
                            const imgSrc = await urlToBase64(link);
                            const decrypted = await decryptImage(imgSrc, localStorage.getItem('key'));
                            img.src = decrypted;
                        } catch (error) {
                            console.error(error);
                        }
                    }
                });
            };

            if (window.innerWidth < 881) {
                PostDOMList.forEach(item => {
                    document.querySelector('main').appendChild(item);
                    if (item.classList && item.classList.contains('post') && !item.classList.contains('post_hidden')) {
                        if (typeof applySmartImageLayout === 'function') {
                            applySmartImageLayout(item);
                        }
                        foldPost(item.querySelector('.content'));
                    }
                })
            } else {
                flowFix({
                    DomElemnt: document.querySelector('main').children,
                    elementArray: PostDOMList
                }).forEach(item => {
                    document.querySelector('main').appendChild(item);
                    item.childNodes.forEach(i => {
                        if (i.classList && i.classList.contains('post') && !item.classList.contains('post_hidden')) {
                            setTimeout(() => {
                                if (typeof applySmartImageLayout === 'function') {
                                    applySmartImageLayout(i);
                                }
                                foldPost(i.querySelector('.content'));
                            }, 0);
                        }
                    })
                })
            }
            if (_down) {
                //load
                document.querySelector('.loadmore').innerText = "加载中...";
                isTriggered = false;
            } else {
                //over
                let text = "没有更多了~";
                if (shareID !== null) {
                    try {
                        document.querySelector('.content').style.maxHeight = '100%';
                        text = "<span onclick='clearParams();'>—— 点击查看所有 ——</span>";
                    } catch (e) {
                        text = "<span onclick='clearParams();'>—— 内容不可见 ——</span>";
                    }
                } else if (Data['pagination']['total_items'] == 0) {
                    text = "—— 内容为空 ——";
                } else if (blocked > 0) {
                    text = "—— 之前内容不可见~ ——";
                }

                if(Data['pagination']['public'] == 1){
                    text = "隐私网站，内容不可见";
                }
                
                document.querySelector('.loadmore').innerHTML = text;
                isTriggered = true;
            }

            if (!_up && !first) {
                const dom = document.querySelector('.social');
                ElementToViewTop(dom, -4);
            }
        })
}

/**
 * 修复瀑布流
 * @param {Object} options 配置
 * @returns DOM list
 */
function flowFix(options) {
    let {
        DomElemnt = null,
        elementArray = null
    } = options;
    columnNum = 0;

    const width = window.innerWidth;
    const column = createElement({ type: 'div', attributes: { className: 'FIX' } });
    let column1 = column.cloneNode();
    let column2 = column.cloneNode();
    let column3 = column.cloneNode();
    let column1Height = 0;
    let column2Height = 0;
    let column3Height = 0;

    if (width < 1240 && columnNum != 1) {
        if (DomElemnt !== undefined && DomElemnt.length !== 0) {
            column1 = DomElemnt[0];
            column1Height = DomElemnt[0].clientHeight;
        }
        elementArray.forEach(ele => {
            const height = Math.min(38 * fontsize, getElementHeight(ele));
            column1Height += height;
            column1.appendChild(ele)
        });
        columnNum = 1;
        return [column1];
    } else if (width > 1240 && width <= 1600 && columnNum !== 2) {
        if (DomElemnt !== undefined && DomElemnt.length !== 0) {
            column1 = DomElemnt[0];
            column2 = DomElemnt[1];
            column1Height = DomElemnt[0].clientHeight;
            column2Height = DomElemnt[1].clientHeight;
        }
        elementArray.forEach(ele => {
            const height = Math.min(38 * fontsize, getElementHeight(ele));
            switch (ifInsert(height, 2)) {
                case 1:
                    column1Height += height;
                    column1.appendChild(ele)
                    break;
                case 2:
                    column2Height += height;
                    column2.appendChild(ele)
                    break;
                default:
                    break;
            }
        })
        columnNum = 2;
        return [column1, column2];

    } else if (width > 1600 && columnNum != 3) {
        if (DomElemnt !== undefined && DomElemnt.length !== 0) {
            column1 = DomElemnt[0];
            column2 = DomElemnt[1];
            column3 = DomElemnt[2];
            column1Height = DomElemnt[0].clientHeight;
            column2Height = DomElemnt[1].clientHeight;
            column3Height = DomElemnt[2].clientHeight;
        }
        elementArray.forEach(ele => {
            const height = Math.min(38 * fontsize, getElementHeight(ele));
            switch (ifInsert(height, 3)) {
                case 1:
                    column1Height += height;
                    column1.appendChild(ele)
                    break;
                case 2:
                    column2Height += height;
                    column2.appendChild(ele)
                    break;
                case 3:
                    column3Height += height;
                    column3.appendChild(ele)
                    break;
                default:
                    break;
            }
        })
        columnNum = 3;
        return [column1, column2, column3];
    }

    function ifInsert(height, column) {
        switch (column) {
            case 2:
                if (height + column1Height > height + column2Height) {
                    return 2;
                }
                return 1;
            case 3:
                if (height + column1Height > height + column2Height) {
                    if (height + column2Height > height + column3Height) {
                        return 3;
                    }
                    return 2;
                }
                return 1;
            default:
                break;
        }
    }
};

/**
 * 获取元素高度
 * @param {element} Domelemnt 元素
 * @returns 高度
 */
function getElementHeight(Domelemnt) {
    const clone = Domelemnt.cloneNode(true);
    clone.style.visibility = "hidden";
    clone.style.position = "absolute";
    clone.style.height = "auto";
    document.body.appendChild(clone);
    const height = clone.offsetHeight;
    document.body.removeChild(clone);
    return height;
}

/**
 * 获取颜色的十六进制值
 * @param {string} rgb RGB to HEX
 * @returns
 */
function rgbToHex(rgb) {
    // 匹配 rgb(255, 0, 0) 格式
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb; // 如果不是 rgb 格式，返回原值

    const toHex = (c) => {
        const hex = parseInt(c).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}

/**
 * fetch
 * @param {object} options api其他参数
 * @param {function} callback 回调
 */
function get_fetch(options, callback) {
    const myfetch = new myFetch();
    myfetch.fetch('/kernel/api.php', {
        method: 'POST',
        body: new URLSearchParams(options)
    })
        .then(response => response.text())
        .then(data => {
            callback(data)
        })
}


/**
 * 根据 MIME 类型或文件名/后缀返回文件的大类
 * @param {string} input - MIME 类型（如 "image/jpeg"）或文件名（如 "test.jpg"）或后缀（如 "jpg"）
 * @returns {"jpg" | "gif" | "video" | "unknown"} 文件类别
 */
function getSupportFormat(input) {
    if (typeof input !== 'string') return 'unknown';

    // 统一转为小写
    const normalized = input.toLowerCase();

    // 定义 MIME 类型到类别的映射
    const mimeToCategory = {
        // 图片类型
        'image/jpeg': 'jpg',
        'image/png': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'jpg',
        // 视频类型
        'video/mp4': 'video',
        'video/quicktime': 'video', // .mov
        'video/x-matroska': 'video', // .mkv
        'video/webm': 'video',
        'video/3gpp': 'video', // .3gp
        'video/mp2t': 'video', // .ts
        'video/x-msvideo': 'video', // .avi
        'video/x-ms-wmv': 'video', // .wmv
        'video/x-ms-asf': 'video', // .asf
        'video/x-rnvb': 'video', // .rmvb
        'video/x-m4v': 'video', // .m4v
        'video/x-ms-vob': 'video', // .vob
        'video/av1': 'video',
    };

    // 定义文件后缀到 MIME 类型的映射（备用）
    const extensionToMime = {
        // 图片
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'jpe': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        // 视频
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'mkv': 'video/x-matroska',
        'webm': 'video/webm',
        '3gp': 'video/3gpp',
        'ts': 'video/mp2t',
        'avi': 'video/x-msvideo',
        'wmv': 'video/x-ms-wmv',
        'asf': 'video/x-ms-asf',
        'rmvb': 'video/x-rnvb',
        'm4v': 'video/x-m4v',
        'vob': 'video/x-ms-vob',
        'av1': 'video/av1',
    };

    // 1. 如果输入是 MIME 类型（如 "image/jpeg"），直接匹配
    if (normalized in mimeToCategory) {
        return mimeToCategory[normalized];
    }

    // 2. 如果输入是文件名或后缀，提取后缀并映射到 MIME 类型
    let extension;
    if (normalized.startsWith('.')) {
        extension = normalized.slice(1); // ".jpg" → "jpg"
    } else if (normalized.includes('.')) {
        extension = normalized.split('.').pop(); // "test.jpg" → "jpg"
    } else {
        extension = normalized; // 直接是后缀（如 "jpg"）
    }

    if (!extension) return 'unknown';

    // 3. 查找后缀对应的 MIME 类型，再匹配类别
    const mimeType = extensionToMime[extension];
    if (mimeType && mimeType in mimeToCategory) {
        return mimeToCategory[mimeType];
    }

    // 4. 特殊处理 GIF（即使后缀是 "gif" 也返回 "gif"）
    if (extension === 'gif') return 'gif';

    // 5. 特殊处理 HEIC/HEIF
    if (extension === 'heic' || extension === 'heif') return 'jpg';

    return 'unknown';
}

/**
 * 图片放大查看功能
 * @param {HTMLImageElement} imgDom - 图片DOM元素
 */
function enlargeImage(imgDom) {
    // 检查传入的是否是图片元素
    if (!imgDom || !(imgDom instanceof HTMLImageElement)) {
        console.error('请传入有效的图片DOM元素');
        return;
    }

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';

    // 添加毛玻璃效果
    overlay.style.backdropFilter = 'blur(5px)';

    // 创建放大后的图片容器
    const enlargedImg = document.createElement('div');
    enlargedImg.style.position = 'relative';
    enlargedImg.style.transformOrigin = 'center center';

    // 创建图片副本
    const imgCopy = imgDom.cloneNode(true);
    imgCopy.style.maxWidth = '80vw';
    imgCopy.style.maxHeight = '80vh';
    imgCopy.style.width = 'auto';
    imgCopy.style.height = 'auto';
    imgCopy.style.borderRadius = '0';
    imgCopy.style.transform = 'scale(1.5)'; // 放大150%
    imgCopy.style.animation = 'fadein 0.5s ease';
    imgCopy.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';

    // 将图片添加到容器
    enlargedImg.appendChild(imgCopy);
    overlay.appendChild(enlargedImg);

    // 添加到body
    document.body.appendChild(overlay);

    // 点击遮罩层关闭
    const closeHandler = (e) => {
        // 如果点击的不是图片或其子元素，则关闭
        if (e.target === overlay || !enlargedImg.contains(e.target)) {
            // document.body.removeChild(overlay);
            ElementFade(overlay, false, true, 500);

            overlay.removeEventListener('click', closeHandler);
        }
    };
    // 添加事件监听
    overlay.addEventListener('click', closeHandler);
    // 防止图片上的点击事件冒泡到遮罩层
    imgCopy.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function hashPasswordSync(password) {
    return new Promise((resolve) => {
        (async () => {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            resolve(hashArray.map(b => b.toString(16).padStart(2, '0')).join(''));
        })();
    });
}

/**
 * 折叠div
 * @param {dom} content 要折叠的div
 */
function foldPost(content) {
    if (shareID > 0) return;
    
    // 纯图片/图片为主的文章不需要折叠
    if (content.dataset.imageDominant === 'true') {
        _remove();
        return;
    }
    
    const offset = getOverHeight(content) / fontsize;
    if (offset > 0 && offset < 6) {
        content.style.maxHeight = content.scrollHeight + 'px';
        _remove();
    } else if (offset > 0) {
        content.style.maxHeight = '38rem';
        //add more
        const button = createElement({ type: 'div', attributes: { className: 'readmore' }, children: [createElement({ type: 'button', attributes: { className: 'read_more mybutton dark', innerHTML: "展开全文" } })] });
        _remove();
        content.insertAdjacentElement('afterEnd', button)
    }
    function _remove() {
        if (content.nextElementSibling.className == 'readmore') {
            content.nextElementSibling.remove();
        }
    }
    function getOverHeight(dom) {
        return dom.scrollHeight - 38 * fontsize;
    }
}

/**
 * SHA256 哈希函数（兼容性版本）
 * @param {string} str 要哈希的字符串
 * @returns SHA256 哈希值
 */
async function hashString(algorithm, str) {
    // 尝试使用 Web Crypto API
    try {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest(algorithm, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch (e) {
        // Web Crypto API 不可用，降级到纯 JS 实现
    }
    
    // 降级方案：纯 JavaScript 实现 SHA256
    return sha256(str);
}

/**
 * 纯 JavaScript SHA256 实现
 */
function sha256(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }

    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;

    var words = [];
    var asciiBitLength = ascii[lengthProperty] * 8;

    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[lengthProperty];

    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return;
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength)

    for (j = 0; j < words[lengthProperty];) {
        var w = words.slice(j, j += 16);
        var oldHash = hash;
        hash = hash.slice(0, 8);

        for (i = 0; i < 64; i++) {
            var i2 = i + j;
            var w15 = w[i - 15], w2 = w[i - 2];
            var a = hash[0], e = hash[4];
            var temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                    w[i - 16]
                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                    + w[i - 7]
                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                ) | 0
                );
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    var result = [];
    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result.push((b < 16 ? '0' : '') + b.toString(16));
        }
    }
    return result.join('');
}

//尝试解密
async function tryDecrypt(text) {
    if (sessionStorage.getItem('key2') === null) {
        const pass = prompt('如果更改了密码请在此输入原密码才能解密');
        const hashpass = await hashPasswordSync(pass);
        const enc = await DecryptText(text.trim(), hashpass);
        if (!_EncryptErr) {
            sessionStorage.setItem('key2', hashpass);
        } else {
            return false;
        }
        return enc;
    } else {
        const enc = await DecryptText(text.trim(), sessionStorage.getItem('key2'));
        return enc;
    }
}

function moveCursorToEnd(editableDiv) {
    editableDiv.focus();
    const range = document.createRange();
    range.selectNodeContents(editableDiv);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * 检查视频封面或图片是否加载成功
 * @param {HTMLVideoElement|HTMLImageElement} element - 视频或图片元素
 * @param {Function} callback - 回调函数，参数为布尔值表示是否加载成功
 */
function checkMediaLoaded(element, callback) {
    if (element.tagName === 'VIDEO') {
        // 处理视频元素的 poster 属性
        const posterUrl = element.getAttribute('poster');
        if (!posterUrl) {
            callback(false); // 无 poster 属性
            return;
        }

        const img = new Image();
        img.onload = () => callback(true);  // poster 加载成功
        img.onerror = () => callback(false); // poster 加载失败
        img.src = posterUrl;
    }
    else if (element.tagName === 'IMG') {
        // 处理图片元素
        if (element.complete) {
            // 如果图片已经完成加载（可能在缓存中）
            callback(element.naturalWidth !== 0);
        } else {
            // 否则监听加载事件
            element.onload = () => callback(true);
            element.onerror = () => callback(false);
        }
    }
    else {
        console.warn('Unsupported element type. Expected VIDEO or IMG element.');
        callback(false);
    }
}

let _share_t = 0;
async function share(id, dom) {
    let text = '';
    let tag = dom.closest('.post').querySelector('.tag').textContent;
    if (getDomFromId('menu').dataset.s == 0) {
        text = `${window.location.href}?tag=${tag}&id=${id}#menu`;
    } else {
        text = `${window.location.href}${tag}/${id}.html#menu`;
    }
    const now = new Date().getTime();
    if (_share_t > now) {
        window.open(text);
        return;
    }
    _share_t = now + 500;
    const success = await copyToClipboard(text);
    if (success) {
        showBubble("链接复制成功！", 'success');
    } else {
        prompt("复制失败，请手动复制。", text);
    }
}

/**
 * 复制文本到剪贴板（兼容现代浏览器和旧浏览器）
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} - 返回是否复制成功
 */
async function copyToClipboard(text) {
    // 1. 优先尝试现代 Clipboard API
    if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);
            return true; // 成功
        } catch (err) {
            console.warn("Clipboard API 失败，尝试降级方案:", err);
        }
    }

    // 2. 降级方案：使用 document.execCommand('copy')
    return fallbackCopyText(text);
}

/**
 * 降级方案：通过临时 textarea 复制文本
 * @param {string} text - 要复制的文本
 * @returns {boolean} - 返回是否复制成功
 */
function fallbackCopyText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed"; // 避免页面滚动
    textarea.style.opacity = "0";     // 隐藏元素
    document.body.appendChild(textarea);
    textarea.select();                // 选中内容

    try {
        const successful = document.execCommand("copy");
        if (successful) {
            console.log("降级方案：复制成功");
            return true;
        } else {
            console.error("降级方案：复制失败");
            return false;
        }
    } catch (err) {
        console.error("降级方案出错:", err);
        return false;
    } finally {
        document.body.removeChild(textarea); // 清理 DOM
    }
}

/**
 * 整的 Fetch 封装，支持超时设置、自动重试和手动取消功能
 */
class myFetch {
    constructor() {
        this.controllers = new Map(); // 存储请求ID和对应的AbortController
        this.activeRequests = new Set(); // 跟踪活跃请求
        this.defaultConfig = {
            retries: 3,
            timeout: 5000,
            retryDelay: 1000,
            exponentialDelay: false,
            retryOn: [408, 502, 503, 504],
            retryOnNetworkError: true,
            // 新增回调函数
            onError: (error, attempt, type) => {
                console.error(`Error (${type}) on attempt ${attempt}:`, error.message);
            },     // 错误回调
            onRetry: (error, attempt, delay) => {
                console.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
            },      // 重试回调
            onTimeout: (error, attempt) => {
                console.warn(`Request timed out on attempt ${attempt}`);
            },    // 超时回调
            onCancel: (error, attempt) => {
                console.warn(`Request timed out on attempt ${attempt}`);
            },    // 取消回调
            onSuccess: (response) => {
            }   // 成功回调（可选）
        };
    }

    /**
     * 生成唯一请求ID
     * @returns {string} 唯一请求ID
     */
    generateRequestId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 验证配置对象
     * @param {object} config - 配置对象
     * @returns {boolean} 是否有效
     */
    validateConfig(config) {
        try {
            if (config.retries !== undefined && (!Number.isInteger(config.retries) || config.retries < 0)) {
                throw new Error('retries must be a non-negative integer');
            }
            if (config.timeout !== undefined && (!Number.isInteger(config.timeout) || config.timeout <= 0)) {
                throw new Error('timeout must be a positive integer');
            }
            if (config.retryDelay !== undefined && (!Number.isInteger(config.retryDelay) || config.retryDelay <= 0)) {
                throw new Error('retryDelay must be a positive integer');
            }
            if (config.retryOn !== undefined && (!Array.isArray(config.retryOn) ||
                !config.retryOn.every(code => Number.isInteger(code) && code >= 400 && code < 600))) {
                throw new Error('retryOn must be an array of HTTP status codes (400-599)');
            }
            return true;
        } catch (error) {
            if (config.onError) {
                config.onError(error);
            }
            return false;
        }
    }

    /**
     * 发起请求
     * @param {string} url - 请求URL
     * @param {object} [options={}] - fetch选项
     * @param {object} [config={}] - 配置选项
     * @param {string} [requestId] - 可选，手动指定请求ID用于取消
     * @returns {Promise<Response|>} 返回响应Promise，失败时返回
     */
    async fetch(url, options = {}, config = {}, requestId) {
        if (typeof url !== 'string' || !url.trim()) {
            const error = new Error('URL must be a non-empty string');
            if (config.onError) config.onError(error);
            return;
        }

        // 合并配置
        const mergedConfig = { ...this.defaultConfig, ...config };
        if (!this.validateConfig(mergedConfig)) {
            return;
        }

        const {
            retries,
            timeout: initialTimeout,
            retryDelay,
            exponentialDelay,
            retryOn,
            retryOnNetworkError,
            onError,
            onRetry,
            onTimeout,
            onSuccess
        } = mergedConfig;

        const id = requestId || this.generateRequestId();
        let controller = new AbortController();

        // 存储控制器以便后续取消
        this.controllers.set(id, controller);
        this.activeRequests.add(id);

        // 清理函数
        const cleanup = () => {
            this.controllers.delete(id);
            this.activeRequests.delete(id);
        };

        let lastError;
        let attempt = 0;
        let currentTimeout = initialTimeout; // 当前请求的超时时间

        while (attempt <= retries) {
            attempt++;
            let timeoutId;

            try {
                // 设置超时
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        controller.abort();
                        const error = new Error(`Request timed out after ${currentTimeout}ms`);
                        if (onTimeout) onTimeout(error, attempt);
                        reject(error);
                    }, currentTimeout);
                });

                // 发起请求
                const responsePromise = fetch(url, {
                    ...options,
                    signal: controller.signal
                });

                // 竞赛：请求或超时
                const response = await Promise.race([responsePromise, timeoutPromise]);
                clearTimeout(timeoutId);

                // 检查HTTP状态码
                if (!response.ok) {
                    if (retryOn.includes(response.status)) {
                        throw new Error(`Retryable HTTP error! status: ${response.status}`);
                    }
                    // 非重试状态码直接返回
                    cleanup();
                    if (onSuccess) onSuccess(response);
                    return response;
                }

                // 成功响应
                cleanup();
                if (onSuccess) onSuccess(response);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                lastError = error;

                // 如果是取消错误
                if (error.name === 'AbortError') {
                    if (!this.controllers.has(id)) {
                        cleanup();
                        const cancelError = new Error('Request was manually cancelled');
                        if (config.onCancel) config.onCancel(cancelError);
                        return;
                    }
                    // 如果是超时，继续重试逻辑
                    if (error.message.includes('timed out')) {
                        if (onTimeout) onTimeout(error, attempt);
                    }
                }
                // 网络错误处理
                else if (error.type === 'system' && retryOnNetworkError) {
                    if (onError) onError(error, attempt, 'network');
                }
                // 其他错误
                else {
                    if (onError) onError(error, attempt, 'request');
                }

                // 检查是否还有重试机会
                if (attempt > retries) {
                    cleanup();
                    if (onError) onError(new Error(`All ${retries} attempts failed`), attempt, 'final');
                    return;
                }

                // 计算重试延迟
                const delay = exponentialDelay ? Math.pow(2, attempt - 1) * retryDelay : retryDelay;

                // 计算下一次的超时时间（与重试延迟相同的增长策略）
                currentTimeout = exponentialDelay ? Math.pow(2, attempt - 1) * initialTimeout : initialTimeout;

                if (onRetry) onRetry(error, attempt, delay);

                // 创建新的AbortController用于下一次尝试
                const newController = new AbortController();
                this.controllers.set(id, newController);
                controller.abort(); // 中止之前的请求（如果还在进行）
                controller = newController;

                // 等待重试延迟
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * 取消指定请求
     * @param {string} requestId - 要取消的请求ID
     * @returns {boolean} 是否成功取消
     */
    cancel(requestId) {
        if (!requestId || typeof requestId !== 'string') {
            if (this.defaultConfig.onError) {
                this.defaultConfig.onError(new Error('Invalid requestId provided for cancellation'));
            }
            return false;
        }

        if (this.controllers.has(requestId)) {
            try {
                const controller = this.controllers.get(requestId);
                controller.abort();
                this.controllers.delete(requestId);
                this.activeRequests.delete(requestId);
                if (this.defaultConfig.onCancel) {
                    this.defaultConfig.onCancel(new Error(`Request ${requestId} has been cancelled`));
                }
                return true;
            } catch (error) {
                if (this.defaultConfig.onError) {
                    this.defaultConfig.onError(error);
                }
                return false;
            }
        }

        if (this.defaultConfig.onError) {
            this.defaultConfig.onError(new Error(`No active request found with ID ${requestId}`));
        }
        return false;
    }

    /**
     * 取消所有活跃请求
     * @returns {number} 被取消的请求数量
     */
    cancelAll() {
        const cancelledCount = this.activeRequests.size;
        this.activeRequests.forEach(id => {
            try {
                if (this.controllers.has(id)) {
                    this.controllers.get(id).abort();
                }
            } catch (error) {
                if (this.defaultConfig.onError) {
                    this.defaultConfig.onError(error);
                }
            }
        });
        this.controllers.clear();
        this.activeRequests.clear();
        return cancelledCount;
    }

    /**
     * 检查请求是否活跃
     * @param {string} requestId - 请求ID
     * @returns {boolean} 是否活跃
     */
    isActive(requestId) {
        if (!requestId || typeof requestId !== 'string') {
            return false;
        }
        return this.activeRequests.has(requestId);
    }

    /**
     * 获取当前活跃请求数量
     * @returns {number} 活跃请求数量
     */
    getActiveRequestCount() {
        return this.activeRequests.size;
    }

    /**
     * 获取默认配置
     * @returns {object} 默认配置对象
     */
    getDefaultConfig() {
        return { ...this.defaultConfig };
    }

    /**
     * 更新默认配置
     * @param {object} newConfig - 新的默认配置
     */
    setDefaultConfig(newConfig) {
        if (this.validateConfig(newConfig)) {
            this.defaultConfig = { ...this.defaultConfig, ...newConfig };
        }
    }
}

// ========== Markdown 渲染增强 ==========
// 确保Markdown内容在页面加载后正确渲染

(function() {
    'use strict';
    
    // 配置
    const CONFIG = {
        maxRetries: 5,           // 最大重试次数
        retryDelay: 500,         // 重试间隔（毫秒）
        renderDelay: 1000,       // 首次渲染延迟（毫秒）
        observerDelay: 300       // DOM变化观察延迟（毫秒）
    };
    
    let retryCount = 0;
    let isRendering = false;
    
    // 延迟执行 Markdown 渲染
    function delayedMarkdownRender() {
        console.log('[MD-Enhancer] 开始延迟渲染检查');
        
        // 等待 marked 库加载
        function waitForMarked(callback) {
            if (typeof marked !== 'undefined') {
                console.log('[MD-Enhancer] marked 库已就绪');
                callback(true);
                return;
            }
            
            if (retryCount >= CONFIG.maxRetries) {
                console.warn('[MD-Enhancer] marked 库未加载，达到最大重试次数');
                callback(false);
                return;
            }
            
            retryCount++;
            console.log(`[MD-Enhancer] 等待 marked 库... (${retryCount}/${CONFIG.maxRetries})`);
            setTimeout(() => waitForMarked(callback), CONFIG.retryDelay);
        }
        
        waitForMarked((markedReady) => {
            // 执行渲染
            setTimeout(() => {
                if (typeof rerenderAllMarkdown === 'function') {
                    try {
                        isRendering = true;
                        const count = rerenderAllMarkdown();
                        console.log(`[MD-Enhancer] 渲染完成，处理了 ${count} 个 Markdown 内容`);
                    } catch (e) {
                        console.error('[MD-Enhancer] 渲染错误:', e);
                    } finally {
                        isRendering = false;
                    }
                } else {
                    console.warn('[MD-Enhancer] rerenderAllMarkdown 函数不存在');
                }
            }, markedReady ? 0 : CONFIG.renderDelay);
        });
    }
    
    // 监听 DOM 变化，自动重新渲染新内容
    function setupMutationObserver() {
        if (!window.MutationObserver) {
            console.warn('[MD-Enhancer] MutationObserver 不支持');
            return;
        }
        
        const targetNode = document.querySelector('main') || document.body;
        
        const observer = new MutationObserver((mutationsList) => {
            // 检查是否有新的 .post 元素被添加
            let hasNewPost = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList && node.classList.contains('post')) {
                                hasNewPost = true;
                            }
                            // 检查子元素
                            if (node.querySelectorAll) {
                                const posts = node.querySelectorAll('.post');
                                if (posts.length > 0) hasNewPost = true;
                            }
                        }
                    });
                }
            }
            
            if (hasNewPost && !isRendering) {
                console.log('[MD-Enhancer] 检测到新文章，准备重新渲染');
                setTimeout(delayedMarkdownRender, CONFIG.observerDelay);
            }
        });
        
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
        
        console.log('[MD-Enhancer] DOM 观察器已设置');
    }
    
    // 初始化
    function init() {
        console.log('[MD-Enhancer] 初始化 Markdown 渲染增强');
        
        // 首次延迟渲染
        setTimeout(delayedMarkdownRender, CONFIG.renderDelay);
        
        // 设置 DOM 观察
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(setupMutationObserver, 500);
            });
        } else {
            setTimeout(setupMutationObserver, 500);
        }
        
        // 暴露全局函数供手动调用
        window.forceRerenderMarkdown = () => {
            console.log('[MD-Enhancer] 手动触发重新渲染');
            retryCount = 0; // 重置重试计数
            delayedMarkdownRender();
        };
        
        console.log('[MD-Enhancer] 可通过 window.forceRerenderMarkdown() 手动触发渲染');
    }
    
    // 启动
    init();
})();
