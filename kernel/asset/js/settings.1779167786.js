function settingsPanel() {
    const settingHTML = `
        <div id="set_panel">
          <div>
            <div class="set_topbar">
              <div class="set_title"><h2>设置</h2></div>
              <div class="set_nav">
              </div>
              <div id="set_close" class="mybutton dark icon-close"></div>
            </div>
            <div class="layout">
            </div>
          </div>
        </div>`
        ;

    if (getDomFromId('set_panel')) {
        getDomFromId('set_panel').remove();
        document.body.style.overflow = '';
        return;
    } else {
        document.body.insertAdjacentHTML('beforeend', settingHTML);
        document.body.style.overflow = 'hidden';
    }

    const dom = getDomFromId('set_panel');
    const setNav = dom.querySelector('.set_nav');
    const setLayout = dom.querySelector('.layout');

    const loading = createElement({
        type: 'div',
        attributes: {
            className: 'loading',
        }
    })
    setLayout.appendChild(loading);
    getDomFromId('set_close').onclick = () => {
        dom.remove();
        document.body.style.overflow = '';
    }

    async function getConfig() {
        const itemList = await fetch('/kernel/config/config.json', { cache: 'no-store' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络请求失败');
                }
                return response.json(); // 解析 JSON 数据
            })

        const configList = await fetch('/kernel/api.php', {
            method: "POST",
            body: new URLSearchParams({
                api: 'settings_get_config',
                token: localStorage.getItem('token')
            })
        }).then(response => {
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            return response.json(); // 解析 JSON 数据
        })

        if (configList.code === 10401) {
            updateLoginStatus();
            return;
        }

        let tags_list = await fetch('/kernel/api.php', {
            method: 'POST',
            body: new URLSearchParams({
                api: 'tags_all',
                sort: 0
            })
        })
            .then(response => response.text())
            .then(data => {
                const result = JSON.parse(data);
                if (result.code === 10401) {
                    updateLoginStatus();
                    return;
                }
                let array = [];
                result.forEach(item => {
                    array.push([item['id'], item['tag'], item['count'], item['hidden']]);
                })
                return array;
            });

        const tip = configList['DISPLAY_TIP'];
        Object.keys(itemList).forEach(key => {
            const nav = createElement({ type: 'a', attributes: { href: `#${key}`, innerHTML: itemList[key].itemName } })
            nav.onclick = () => {
                clearAnchor();
            }
            setNav.appendChild(nav);
            const itemPan = createElement({ type: 'div', attributes: { className: 'sett_item', id: key }, children: [createElement({ type: 'h2', attributes: { className: `item_title icon-${itemList[key].itemIcon}`, innerHTML: `${itemList[key].itemName}&nbsp;` } })] })
            setLayout.appendChild(itemPan);

            itemList[key].itemOptions.forEach(i => {
                let configValue = configList[i.value] == undefined ? (i.default == '' ? '' : i.default) : configList[i.value];

                const title = configTitle(i.item, i.title, i.summary, tip);
                const _reset = configBtnDom('reset', '重置', false, true);
                const _submit = configBtnDom('submit', '更改', true, true);
                const _default = createElement({ type: 'button', attributes: { className: 'mybutton icon-reset' } })
                const _rename = configBtnDom('button', '更名', false, true);
                const _hidden = configBtnDom('button', '隐藏', false, true);
                const _delete = configBtnDom('button', '删除标签', false, true);
                let item;
                switch (i.mod) {
                    case "pic_upload":
                        //图片上传
                        item = pictureCoreUploadDom(i.item, i.value + "?v=" + configList['CACHE']);
                        break;
                    case "text":
                    case "color":
                    case "tel":
                        item = configInput(i.item, i.mod, i.placeholder, configValue, i.required);
                        item.addEventListener('input', () => {
                            //必填项
                            if (i.required == 'true' && item.value == '') {
                                _btn(false, [_reset, _submit])
                                return;
                            }
                            //格式判断
                            if (new RegExp(i.regular).test(item.value)) {
                                item.style.color = 'var(--TITLE_COLOR)';
                                _btn(true, [_reset, _submit])
                            } else {
                                item.style.color = 'red';
                                _btn(false, [_reset, _submit])
                            }
                            //有无更改
                            if (item.value == configValue) {
                                _btn(false, [_reset, _submit])
                            }


                            //颜色实时更新
                            if (i.item.includes('color')) {
                                setCssVariable(`--${i.value}`, item.value);
                            }
                        });
                        break;
                    case "textarea":
                        item = configTextarea(i.item, i.placeholder, configValue, i.required);
                        if (i.item == 'setSitemap') {
                            if (configList['PSEUDO_STATIC'] == '0') {
                                item.disabled = true;
                                title.querySelector('span').innerHTML += '<span style="color:red"> 需要启用伪静态</span>';
                            }
                        }
                        item.addEventListener('input', () => {
                            if (item.value == configValue) {
                                _btn(false, [_reset, _submit])
                            } else {
                                _btn(true, [_reset, _submit])
                            }
                        });
                        break;
                    case "scoial":
                        const socialList = createElement({ type: 'div', attributes: { id: `${i.item}List` } });
                        const values = JSON.parse(configValue);
                        loadSocialList(values, socialList);
                        const social_select = configSelect(i.item, i.placeholder, i.optional.sort(), configValue, (e) => {
                            socialList.insertAdjacentElement('beforeend', createPopupItemDom(e));
                        })
                        item = createElement({ type: 'div', attributes: { className: i.item }, children: [social_select, socialList] })
                        new MutationObserver(() => { _addbuton([_reset, _submit]) }).observe(socialList, { childList: true });
                        break;
                    case "radio":
                        item = configRadio(i.item, i.optional, configValue);
                        if (i.item == 'setPicterZipHigh') {
                            if (configList['GD_PIC'] == 'true' || configList['IMAGICK_PIC'] == 'true') {
                                item.querySelectorAll('input').forEach(i => {
                                    if (i.value == '1') {
                                        i.disabled = true;
                                        title.querySelector('span').innerHTML += '<span style="color:red"> 需要PHP > 8.1</span>';
                                    }
                                })
                            }
                        }
                        item.addEventListener('click', (e) => {
                            if (i.item == "pseudoStatic") {
                                let mode = null;
                                if (e.target.value == 1) {
                                    mode = true;
                                } else if (e.target.value == 0) {
                                    mode = false;
                                }
                                if (mode == null) return;
                                get_fetch({
                                    api: 'set_pseudo_static',
                                    token: localStorage.getItem('token'),
                                    mode: mode
                                }, e => {
                                    const Data = JSON.parse(e);
                                    if (Data.code == 10200 && (Data.success == false || Data.success == true)) {
                                    } else {
                                        showBubble(`伪静态更改失败`, 'error');
                                    }
                                })
                            }
                            if (e.target.tagName == 'INPUT') {
                                updateConfig(i.value, e.target.value)
                            }
                        })
                        break;
                    case "tags_manage":
                        item = configTagManage(i.item, tags_list, i.placeholder, (has) => {
                            if (has) {
                                const tagInput = getDomFromId(i.item);
                                tags_list.forEach(tag => {
                                    if (tagInput.value == tag[1]) {
                                        if (tag[3] == 0) {
                                            _hidden.value = '隐藏';
                                        } else {
                                            _hidden.value = '取消隐藏';
                                        }
                                    }
                                })
                                _btn(true, [_rename, _hidden, _delete]);
                            } else {
                                _btn(false, [_rename, _hidden, _delete]);
                            }
                        });
                        break;
                    case "export":
                        item = configCheckBox(i.item, i.optional, configValue);
                        break;
                    case "import":
                        const p1 = createElement({ type: 'p', attributes: { innerText: '配置上传：' } })
                        const file1 = createElement({ type: 'input', attributes: { id: i.item + 'File1', type: 'file', accept: '.ini' } })
                        const p2 = createElement({ type: 'p', attributes: { innerText: '数据库备份上传：' } })
                        const file2 = createElement({ type: 'input', attributes: { id: i.item + 'File2', type: 'file', accept: '.sql' } })
                        item = createElement({ type: 'div', attributes: { style: 'color:var(--CONTENT_COLOR)' }, children: [p1, file1, p2, file2] })
                        break;
                    case "password":
                        item = configPass(i.item);
                        break;
                    case "select":
                        const timeZones = Intl.supportedValuesOf('timeZone');
                        item = configSelect(i.item, i.title, timeZones, configValue, (e) => {
                            updateConfig(i.value, e)
                        }, true);
                        break;
                }


                if (i.item == 'colorTag') {
                    title.insertAdjacentHTML('beforeend', `<div class="tag icon-topic" style="margin:0.5rem 0;">${i.optional}</div><br>`);
                } else if (i.item == 'colorInput') {
                    title.insertAdjacentHTML('beforeend', `<input type="text" style="margin:0.5rem 0;" placeholder="${i.optional}"><br>`);
                }



                itemPan.appendChild(title);
                title.appendChild(item);



                switch (i.mod) {
                    case "text":
                    case "color":
                    case "textarea":
                    case "tel":
                        _reset.onclick = () => {
                            item.value = configValue;
                            _btn(false, [_reset, _submit]);
                            //实时颜色重置
                            if (i.item.includes('color')) {
                                setCssVariable(`--${i.value}`, configValue);
                            }
                        }

                        _submit.onclick = () => {
                            updateConfig(i.value, item.value);
                            configValue = item.value;

                            //昵称实时更新
                            if (i.item == 'nikeName') {
                                const h2 = document.querySelector('.user h2');
                                const buttonHTML = h2.querySelector('button')?.outerHTML || '';
                                h2.innerHTML = `${item.value}${buttonHTML}`;
                                //签名实时更新
                            } else if (i.item == 'userSign') {
                                const p = document.querySelector('.user p');
                                p.innerHTML = item.value;
                                //颜色实时更新
                            } else if (i.item.includes('color')) {
                                setCssVariable(`--${i.value}`, item.value);
                            }
                            _btn(false, [_reset, _submit]);
                        }

                        title.appendChild(_reset);
                        title.appendChild(_submit);

                        //恢复默认
                        if (i.default !== '' && item.value !== i.default) {
                            title.appendChild(_default);
                            _default.onclick = () => {
                                if (!confirm("确定要恢复默认值吗？")) return;
                                item.value = i.default;
                                setCssVariable(`--${i.value}`, item.value);
                                updateConfig(i.value, i.default);
                                configValue = item.value;
                                _default.remove();
                            }
                        }
                        break;
                    case "scoial":
                        const socialList = getDomFromId(`${i.item}List`);
                        socialList.addEventListener('click', (e) => {
                            const dom = e.target;
                            const item = dom.closest('.socialAddItem');
                            if (dom.classList.contains('up')) {
                                swapDOM(item, item.previousElementSibling);
                            } else if (dom.classList.contains('down')) {
                                swapDOM(item.nextElementSibling, item);
                            } else if (dom.classList.contains('remove')) {
                                item.remove();
                            };
                        })
                        _reset.onclick = () => {
                            const values = JSON.parse(configValue);
                            socialList.replaceChildren();
                            loadSocialList(values, socialList);
                            setTimeout(() => {
                                _btn(false, [_reset, _submit])
                            }, 100);
                        }

                        _submit.onclick = () => {
                            const json = {};
                            //获取更改数据
                            Array.from(socialList.querySelectorAll('input')).forEach(dom => {
                                const key = dom.previousElementSibling.title;
                                const value = dom.value
                                json[key] = value;
                            })
                            updateConfig(i.value, JSON.stringify(json));
                            setTimeout(() => {
                                _btn(false, [_reset, _submit])
                            }, 100);
                        }

                        title.appendChild(_reset);
                        title.appendChild(_submit);
                        break;
                    case "tags_manage":
                        const tagInput = getDomFromId(i.item);
                        _rename.onclick = () => {
                            const rename = createElement({ type: 'input', attributes: { type: 'text', style: 'width:29%; margin: 0 1rem 0 0;', placeholder: '新的标签名称', maxLength: i.optional['maxLength'] } })
                            const renameSub = configBtnDom('reset', '取消');
                            _btn(false, [_rename, _hidden, _delete]);
                            title.appendChild(rename);
                            title.appendChild(renameSub);
                            rename.focus();
                            rename.oninput = () => {
                                if (rename.value == '') {
                                    renameSub.type = 'reset';
                                    renameSub.value = '取消';
                                } else {
                                    renameSub.type = 'submit';
                                    renameSub.value = '提交';
                                }
                            }
                            renameSub.onclick = () => {
                                if (rename.value == '') {
                                    _renameBtn()
                                    return;
                                } else {
                                    if (!confirm('请确认更名操作')) {
                                        _renameBtn()
                                        return;
                                    }
                                    get_fetch({
                                        api: 'set_tags_change',
                                        token: localStorage.getItem('token'),
                                        tag: tagInput.value,
                                        mode: 'rename',
                                        value: rename.value
                                    }, data => {
                                        console.log(data);
                                        const Data = JSON.parse(data);
                                        if (Data.code === 10401) {
                                            updateLoginStatus();
                                            return;
                                        }
                                        if (Data.code === 10200) {
                                            showBubble('标签已更名', 'success');
                                            tagInput.value = '';
                                            _updateTagList();
                                            _renameBtn();
                                            get_tags();
                                            get_yearmonth();
                                        } else {
                                            showBubble('标签更名失败', 'error');
                                        }
                                    })
                                }
                            }
                            function _renameBtn() {
                                rename.remove();
                                renameSub.remove();
                                _btn(true, [_rename, _hidden, _delete]);
                            }
                        }

                        _hidden.onclick = () => {
                            if (!confirm('设为隐藏后，与该标签相关的所哟内容将不对访客展示。')) {
                                return;
                            }
                            get_fetch({
                                api: 'set_tags_change',
                                token: localStorage.getItem('token'),
                                tag: tagInput.value,
                                mode: 'hidden'
                            }, data => {
                                const Data = JSON.parse(data);
                                if (Data.code === 10401) {
                                    updateLoginStatus();
                                    return;
                                }
                                if (Data.code === 10200) {
                                    if (Data.info == 1) {
                                        _hidden.value = '取消隐藏';
                                        showBubble('标签已取消隐藏', 'success');
                                    } else {
                                        _hidden.value = '隐藏';
                                        showBubble('标签已隐藏', 'success');
                                    }
                                    _updateTagList();
                                    get_tags();
                                    get_yearmonth();
                                } else {
                                    showBubble('标签隐藏失败', 'error');
                                }
                            })
                        }

                        _delete.onclick = () => {
                            if (!confirm('警告！不可恢复的操作。\n确认要删除与该标签相关的所有内容吗？')) {
                                return;
                            }
                            get_fetch({
                                api: 'set_tags_change',
                                token: localStorage.getItem('token'),
                                tag: tagInput.value,
                                mode: 'delete'
                            }, data => {
                                const Data = JSON.parse(data);
                                if (Data.code === 10401) {
                                    updateLoginStatus();
                                    return;
                                }
                                if (Data.code === 10200) {
                                    showBubble('标签已删除', 'success');
                                    tagInput.value = '';
                                    _btn(false, [_rename, _hidden, _delete]);
                                    _updateTagList();
                                    get_tags();
                                    get_yearmonth();
                                } else {
                                    showBubble('标签删除失败', 'error');
                                }
                            })
                        }
                        title.appendChild(_rename);
                        title.appendChild(_hidden);
                        title.appendChild(_delete);
                        break;
                    case "password":
                        const _change = configBtnDom('submit', '确认修改', false, true);
                        const inputs = item.querySelectorAll('input');
                        item.querySelectorAll('input').forEach(input => {
                            input.addEventListener('input', () => { _addbuton([_change]) })
                        })
                        _change.addEventListener('click', async () => {
                            let _pass = [];

                            for (const input of inputs) {
                                const hash = await hashString('SHA-256', input.value + doman + getDomFromId('app').dataset.uid);
                                _pass.push(hash);
                            }
                            if (!(inputs[2].value.length <= 18 && inputs[2].value.length >= 4)) {
                                showBubble('密码长度不符 4-18位', 'warning');
                                return;
                            }
                            if (!(inputs[1].value == inputs[2].value && inputs[0].value !== '')) {
                                showBubble('密码不一致', 'warning');
                                return;
                            };
                            get_fetch({
                                api: 'set_update_password',
                                token: localStorage.getItem('token'),
                                data: JSON.stringify(_pass)
                            }, data => {
                                const Data = JSON.parse(data);
                                if (Data.code === 10401) {
                                    updateLoginStatus();
                                    return;
                                }
                                if (Data.code === 10200) {
                                    showBubble('密码已修改', 'success');
                                    item.querySelectorAll('input').forEach(input => {
                                        input.value = '';
                                    })
                                    _change.classList.add('hidden');
                                } else if (Data.code === 10204) {
                                    showBubble('原密码错误', 'error');
                                } else {
                                    showBubble('未知错误', 'error');
                                }
                            })
                        })
                        title.appendChild(_change);
                        break;
                    case "radio":
                        let _current;
                        item.querySelectorAll('input').forEach(e => {
                            if (e.checked) {
                                _current = e.value
                            }
                        })
                        if (i.default !== '' && _current !== i.default) {
                            item.appendChild(_default);
                            _default.onclick = () => {
                                if (!confirm("确定要恢复默认值吗？")) return;
                                item.value = i.default;
                                setCssVariable(`--${i.value}`, item.value);
                                updateConfig(i.value, i.default);
                                _default.remove();
                                item.querySelectorAll('input').forEach(j => {
                                    if (j.value == i.default) {
                                        j.checked = true;
                                    }
                                })
                            }
                        }
                        break;
                    case "export":
                        const _export = configBtnDom('submit', '导出数据库', false, true);
                        _export.classList.remove('hidden');
                        _export.onclick = () => {
                            let data = [];
                            item.querySelectorAll('input').forEach(input => {
                                data.push(input.checked);
                            })
                            if (!(data[0] || data[1])) {
                                showBubble('至少选择一项', 'warning');
                                return;
                            }
                            get_fetch({
                                api: 'set_database_export',
                                token: localStorage.getItem('token'),
                                data: JSON.stringify(data)
                            }, fetch_data => {
                                const Data = JSON.parse(fetch_data);
                                if (Data.code === 10401) {
                                    updateLoginStatus();
                                    return;
                                }
                                if (Data.code === 10200) {
                                    showBubble('导出成功', 'success');
                                    data[0] ? downloadFromUrl('/uploads/temp/config.ini') : '';
                                    data[1] ? downloadFromUrl('/uploads/temp/content_backup.sql') : '';
                                } else {
                                    showBubble('导出失败', 'error');
                                }
                            })
                        }
                        title.appendChild(_export);
                        break;
                    case "import":
                        const _import = configBtnDom('submit', '导入数据库', false, true);
                        _import.classList.remove('hidden');
                        _import.onclick = () => {
                            const formData = new FormData();
                            let data = [];
                            item.querySelectorAll('input').forEach(input => {
                                data.push(input.value);
                                if (input.value == '') return;
                                formData.append('files[]', input.files[0])
                            })
                            if (data[0] == '' && data[1] == '') {
                                showBubble('至少选择一个文件', 'warning');
                                return;
                            }
                            formData.append('api', 'set_database_import');
                            formData.append('token', localStorage.getItem('token'));
                            fetch('/kernel/api.php', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.text())
                                .then(fetch_data => {
                                    const Data = JSON.parse(fetch_data);
                                    if (Data.code === 10401) {
                                        updateLoginStatus();
                                        return;
                                    }
                                    if (Data.code === 10200) {
                                        showBubble('导入成功', 'success');
                                    } else {
                                        showBubble('导入失败', 'error');
                                    }
                                })
                        }
                        title.appendChild(_import);
                        break;
                }

                if (i.item == 'setVisit') {
                    const button = createElement({ type: 'button', attributes: { className: 'mybutton socialSelect_button visit_button dark', style: 'display:block', innerHTML: '查看访客记录', disabled: configValue == 0 ? true : false } });
                    button.onclick = () => {
                        window.open('/kernel/config/visit.json')
                    }
                    item.appendChild(button);
                }

                function _btn(_true, list) {
                    if (_true) {
                        list.forEach(btn => {
                            btn.classList.remove('hidden');
                        })
                        _submit.removeAttribute('disabled');
                    } else {
                        list.forEach(btn => {
                            btn.classList.add('hidden');
                        })
                        _submit.setAttribute('disabled', true);
                    }
                }

                const _addbuton = (list) => {
                    list.forEach(btn => {
                        btn.classList.remove('hidden');
                    })
                    _submit.removeAttribute('disabled');
                }

                function _updateTagList() {
                    fetch('/kernel/api.php', {
                        method: 'POST',
                        body: new URLSearchParams({
                            api: 'tags_all',
                            sort: 0
                        })
                    })
                        .then(response => response.text())
                        .then(data => {
                            const result = JSON.parse(data);
                            if (result.code === 10401) {
                                updateLoginStatus();
                                return;
                            }
                            let array = [];
                            result.forEach(item => {
                                array.push([item['id'], item['tag'], item['count'], item['hidden']]);
                            })
                            tags_list = array;
                        });
                }

                function loadSocialList(values, socialList) {
                    Object.keys(values).forEach((key) => {
                        const im = createPopupItemDom(key, values[key])
                        socialList.insertAdjacentElement('beforeend', im);
                        im.addEventListener('input', () => { _addbuton([_reset, _submit]) }, { once: true });
                    })
                }
            });

        })
        loading.remove();

        const info = new DOMParser().parseFromString(`
            <div class="settingInfo">
            <div class="oterInfo">
                <br>
                <label for="viewTip"><span>默认展开提示</span></label><input type="checkbox" name="viewTip" id="viewTip" ${configList['DISPLAY_TIP'] == 1 ? "checked" : ''}>
                <br>
                <br>
                <input id='upcache' class='mybutton dark' type='button' value='更新JS/CSS缓存'>
                <br>
                <br>
                ${configList['PSEUDO_STATIC'] == 1 ? `<input id='upSiteMap' class='mybutton dark' type='button' value='手动更新siteMap文件'><br><br>` : ""}
            </div>
            <div class="expload">
                <span>当前版本 ${configList['version']}</span>
                <br>
                <span>ID:${configList['uid']}</span>
                <br>
                <br>
            </div></div>`, 'text/html').body.firstChild;

        setLayout.insertAdjacentElement('afterend', info);
        info.querySelector('#viewTip').onclick = (e) => {
            if (e.target.checked) {
                updateConfig("DISPLAY_TIP", 1);
                dom.querySelectorAll('details').forEach(i => {
                    i.setAttribute('open', true);
                })
                return;
            } else {
                updateConfig("DISPLAY_TIP", 0);
                dom.querySelectorAll('details').forEach(i => {
                    i.removeAttribute('open');
                })
                return;
            }
        }

        getDomFromId('upcache').onclick = () => {
            get_fetch({
                api: 'set_cache_update',
                token: localStorage.getItem('token')
            }, data => {
                const Data = JSON.parse(data);
                if (Data.code === 10401) {
                    updateLoginStatus();
                    return;
                }
                if (Data.code === 10200) {
                    showBubble('缓存已更新，请刷新页面', 'success');
                } else if (Data.code === 10332) {
                    showBubble('错误：DEV环境禁用缓存', 'error', 5000);
                } else {
                    showBubble('发生错误！请联系管理员', 'error', 5000);
                }
            })
        }
        if (configList['PSEUDO_STATIC'] == 1) {
            getDomFromId('upSiteMap').onclick = () => {
                get_fetch({
                    api: 'set_sitemap_update',
                    token: localStorage.getItem('token')
                }, data => {
                    const Data = JSON.parse(data);
                    if (Data.code === 10401) {
                        updateLoginStatus();
                        return;
                    }
                    if (Data.success === 'ok') {
                        showBubble(`更新了${Data.info}条记录`, 'success');
                    } else {
                        showBubble('sitemap更新错误' + Data.info, 'error', 5000);
                    }
                })
            }
        }

        setTimeout(() => {
            CropperListener();
        }, 100);
    }
    getConfig();

}

function configBtnDom(type, value, disabled = false, hidden = false) {
    return createElement({ type: 'input', attributes: { type: type, value: value, className: `mybutton dark${hidden ? ' hidden' : ''}`, disabled: disabled } })
};

function configTitle(id, title, summary, summary_view) {
    return new DOMParser().parseFromString(`<div class="${id}"><details ${summary_view == 1 ? 'open' : ''}><summary>${title}<i class="icon-help"></i></summary><span>${summary}</span></details>`, 'text/html').body.firstChild;
};

function pictureCoreUploadDom(id, picture_url) {
    return new DOMParser().parseFromString(`
        </details>
        <div class="picture_box">
            <div class="${id}_mask"></div>
            <img class="${id}_img" src="${picture_url}">
            <canvas class="${id}_cropped_canvas"></canvas>
            <input type="file" id="${id}File" accept="image/*">
        </div>
        <div></div>
    </div>
    `, 'text/html').body.firstChild;

};

function configInput(id, input_type, placeholder, value, required) {
    return createElement({
        type: 'input',
        attributes: {
            id: id,
            type: input_type,
            placeholder: placeholder,
            value: value,
            required: required
        }
    })
};

function configTextarea(id, placeholder, value, required) {
    return createElement({
        type: 'textarea',
        attributes: {
            id: id,
            placeholder: placeholder,
            value: value,
            required: required
        }
    })
};

function colorSelect(id, value) {
    return new DOMParser().parseFromString(`
        <input id="${id}Input" type="color" value="${value}">
        `, 'text/html').body.firstChild;
};

function createPopupItemDom(icon, value = '') {
    const i = createElement({ type: 'i', attributes: { className: `icon-${icon}`, title: icon } });
    const input = createElement({ type: 'input', attributes: { type: 'text', placeholder: '社交平台个人首页链接', value: value } });
    const up = createElement({ type: 'button', attributes: { className: `mybutton dark up`, innerHTML: '向上' } });
    const down = createElement({ type: 'button', attributes: { className: `mybutton dark down`, innerHTML: '向下' } });
    const remove = createElement({ type: 'button', attributes: { className: `mybutton dark remove`, innerHTML: '移除' } });
    const item = createElement({ type: 'div', attributes: { className: 'socialAddItem' }, children: [i, input, up, down, remove] })
    return item;
}

function configRadio(id, optional, current) {
    item = '';
    optional.forEach(obj => {
        const key = Object.keys(obj)[0];
        const value = Object.keys(obj)[0];
        item += `
        <label for="${id + key}">
            <input type="radio" name="${id}" id="${id + key}" ${current == key ? "checked" : ''} value="${value}">
            <span>${obj[key]}</span>
        </label>`;
    });
    return new DOMParser().parseFromString(`<div style="display: inline-block;">${item}</div>`, 'text/html').body.firstChild;
}

function configCheckBox(id, optional, value) {
    item = '';
    optional.forEach(obj => {
        const key = Object.keys(obj)[0];
        item += `
        <label for="${id + key}">
            <input type="checkbox" name="${id}" id="${id + key}" ${value == key ? "checked" : ''}>
            <span>${obj[key]}</span>
        </label>`;
    });
    return new DOMParser().parseFromString(`<div>${item}</div>`, 'text/html').body.firstChild;
}

function configTagManage(id, tags_list, placeholder, callback) {

    //优化，数量过多影响性能，输入一个字后，返回1则输出列表。返回0则或清除
    const inputlist = createElement({ type: 'input', attributes: { id: id, type: 'text', placeholder: placeholder } })
    inputlist.setAttribute('list', id + "Input")
    const _options = createElement({ type: "datalist", attributes: { id: id + "Input" } })
    tags_list.forEach(tag => {
        const item = createElement({ type: 'option', attributes: { value: tag[1] } });
        item.setAttribute('data-hidden', tag[3]);
        _options.appendChild(item)
    })
    inputlist.addEventListener('input', () => {
        get_fetch({
            api: 'tag_if',
            token: localStorage.getItem('token'),
            tag: inputlist.value
        }, (info => {
            const Data = JSON.parse(info).info;
            if (Data.code === 10401) {
                updateLoginStatus();
                return;
            }
            if (Data[2] === 2) {
                callback(true);
            } else {
                callback(false);
            }
        }))
    });
    return createElement({ type: 'div', attributes: { className: id }, children: [inputlist, _options] })
}

function configSelect(id, button_name, optional, value, callback, update_select_text, item_active_disable = true) {
    const array = optional;
    let Item = [];
    array.forEach(item => {
        Item.push({ item_html: `<span>${item}</span><i class="icon-${item}"></i>`, item_value: item, item_active: (item == value) });
    })

    return createSelection({
        select_attributes: { className: `${id} mySelection` },
        button_attributes: { className: `${id}_button`, innerHTML: update_select_text ? value : button_name },
        button_height: '2.5rem',
        item_active_disable: item_active_disable,
        update_select_text: update_select_text,
        select_items: Item
    }, (e) => {
        callback(e);
    });
}

function configPass(id) {
    const p1 = createElement({ type: 'input', attributes: { id: id + "O", type: "password", placeholder: "请输入原密码" } });
    const p2 = createElement({ type: 'input', attributes: { id: id + "N", type: "password", placeholder: "输入新密码" } });
    const p3 = createElement({ type: 'input', attributes: { id: id + "NN", type: "password", placeholder: "再次输入新密码" } });

    return createElement({ type: 'div', attributes: { id: id }, children: [p1, p2, p3] });
}

function swapDOM(element1, element2) {
    if (!element1 || !element2) {
        return;
    }
    element2.before(element1);
    element1.after(element2);
}

function CropperListener() {
    const avatarBox = document.getElementsByClassName('userAvatar')[0];
    const width = getDomFromId('personal').clientWidth;
    const avatarFile = getDomFromId('userAvatarFile');
    const avatarEditor = avatarBox.lastElementChild;
    avatarEditor.appendChild(createCropper(avatarFile, [1, 1], width, 1, document.querySelector('.userAvatar_cropped_canvas'), 'avatar', 240))

    const backgroundBox = document.getElementsByClassName('userBackground')[0];
    const backgroundFile = getDomFromId('userBackgroundFile');
    const backgroundEditor = backgroundBox.lastElementChild;
    backgroundEditor.appendChild(createCropper(backgroundFile, [5, 3], width, 1, document.querySelector('.userBackground_cropped_canvas'), 'background', 1200))

};

function updateConfig(key, value) {
    get_fetch({
        api: 'set_update_config',
        token: localStorage.getItem('token'),
        key: key,
        value: value
    }, (e) => {
        const Data = JSON.parse(e);
        if (Data.code === 10401) {
            updateLoginStatus();
            return;
        }
        if (Data.code == 10200) {
            showBubble(`配置已更新`, 'success');
        } else {
            showBubble(`更新错误`, 'error');
        }
    })
}

/**
 * 创建裁切器
 * @param {Element} fileInput 监听图片上传
 * @param {Array} crop_ratio [w,h] 裁剪比例
 * @param {Number} viewWidth canvas宽度
 * @param {Number} quality 0-1 上传质量
 * @param {Element} cropped_canvas 裁剪画布
 * @param {String} mode 上传模式
 * @param {Number} outputResolution 输出分辨率（宽度的像素值，高度按比例计算）
 * @returns 返回 DOM 元素
 */
function createCropper(fileInput, crop_ratio, viewWidth, quality, croppedCanvas, mode, outputResolution) {
    const originalImage = createElement({ type: 'img', attributes: { style: 'max-width: 100%; display: none;' } });
    const sourceCanvas = createElement({ type: 'canvas' }); // 显示用canvas
    const highResCanvas = createElement({ type: 'canvas', attributes: { style: 'display: none;' } }); // 高分辨率canvas
    const resizeHandle = createElement({ type: 'div', attributes: { className: 'resize-handle' } });
    const cropBtn = createElement({ type: 'input', attributes: { type: 'submit', value: '上传图片', className: 'mybutton dark', disabled: true } });
    const closeBtn = createElement({ type: 'input', attributes: { type: 'button', value: '关闭面板', className: 'mybutton dark' } });
    const btnBox = createElement({ type: 'div', attributes: { style: 'width:100%' }, children: [cropBtn, closeBtn] })
    const selectionBox = createElement({ type: 'div', attributes: { className: 'selection-box' }, children: [resizeHandle] });
    const cropperContainer = createElement({ type: 'div', attributes: { className: 'cropper-container', style: 'display: none;' }, children: [sourceCanvas, selectionBox] });
    const Cropper = createElement({ type: 'div', attributes: { className: 'Cropper', style: 'display:none' }, children: [originalImage, cropperContainer] });
    const loading = createElement({ type: 'p', attributes: { style: 'color:red;font-size:1.2rem;font-weight:bold', innerHTML: "切图组件加载中，请稍后..." } })

    // 全局变量
    let isDragging = false;
    let isResizing = false;
    let startX, startY;
    let scaleX = 1, scaleY = 1; // 新增比例变量
    let selection = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0
    };
    let imageRatio = 1;

    // 监听文件选择
    fileInput.addEventListener('change', handleFileSelect);

    // 选择框鼠标事件
    selectionBox.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', endDrag);

    // 调整大小手柄事件
    resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startResize(e);
    });

    // 按钮事件
    cropBtn.addEventListener('click', () => {
        cropImage();
        uploadImage();
    });
    closeBtn.addEventListener('click', close);

    function close() {
        originalImage.style.display = Cropper.style.display = 'none';
        loading.remove();
        btnBox.remove();
        fileInput.value = '';
        const ctx = sourceCanvas.getContext('2d');
        ctx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
        sourceCanvas.width = 0;
        sourceCanvas.height = 0;
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCanvas.style.display = 'none';
        croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || !file.type.match('image.*')) {
            console.log('请选择有效的图片文件');
            return;
        }
        //loading
        Cropper.insertAdjacentElement('beforebegin', loading)

        Cropper.style.display = 'block';
        const reader = new FileReader();
        reader.onload = function (e) {
            originalImage.src = e.target.result;
            originalImage.onload = function () {
                initCropper(viewWidth);
            };
        };
        reader.readAsDataURL(file);
    }

    function initCropper(viewWidth) {
        originalImage.style.display = 'none';
        cropperContainer.style.display = 'inline-block';

        //view button
        Cropper.appendChild(btnBox)
        loading.remove()

        const maxWidth = viewWidth;
        imageRatio = originalImage.naturalWidth / originalImage.naturalHeight;

        // 计算显示canvas大小
        let displayWidth, displayHeight;
        if (originalImage.naturalWidth > maxWidth) {
            displayWidth = maxWidth;
            displayHeight = maxWidth / imageRatio;
        } else {
            displayWidth = originalImage.naturalWidth;
            displayHeight = originalImage.naturalHeight;
        }

        // 设置显示canvas大小
        sourceCanvas.width = displayWidth;
        sourceCanvas.height = displayHeight;

        // 设置高分辨率canvas大小（原始图片大小）
        highResCanvas.width = originalImage.naturalWidth;
        highResCanvas.height = originalImage.naturalHeight;

        // 计算比例
        scaleX = originalImage.naturalWidth / displayWidth;
        scaleY = originalImage.naturalHeight / displayHeight;

        // 绘制到两个canvas
        const displayCtx = sourceCanvas.getContext('2d');
        displayCtx.drawImage(originalImage, 0, 0, displayWidth, displayHeight);

        const highResCtx = highResCanvas.getContext('2d');
        highResCtx.drawImage(originalImage, 0, 0, originalImage.naturalWidth, originalImage.naturalHeight);

        // 计算初始裁剪框大小（基于显示canvas）
        const minSize = Math.min(displayWidth, displayHeight) * 0.8;
        let boxWidth, boxHeight;

        if (crop_ratio[0] > crop_ratio[1]) {
            boxWidth = minSize;
            boxHeight = boxWidth * crop_ratio[1] / crop_ratio[0];
        } else {
            boxHeight = minSize;
            boxWidth = boxHeight * crop_ratio[0] / crop_ratio[1];
        }

        // 计算基于宽高比的最小尺寸
        const aspectRatio = crop_ratio[0] / crop_ratio[1];
        const minWidthBasedOnHeight = 50 * aspectRatio; // 基于高度的最小宽度
        const minHeightBasedOnWidth = 50 / aspectRatio; // 基于宽度的最小高度

        selection = {
            x: Math.max(0, Math.min((displayWidth - boxWidth) / 2, displayWidth - boxWidth)),
            y: Math.max(0, Math.min((displayHeight - boxHeight) / 2, displayHeight - boxHeight)),
            width: boxWidth,
            height: boxHeight,
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0,
            minWidth: Math.max(50, minWidthBasedOnHeight), // 确保最小宽度满足宽高比
            minHeight: Math.max(50, minHeightBasedOnWidth) // 确保最小高度满足宽高比
        };

        updateSelectionBox();
        cropBtn.disabled = false;
        setupTouchEvents();
    }

    function setupTouchEvents() {
        selectionBox.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        const resizeHandle = document.querySelector('.resize-handle');
        resizeHandle.addEventListener('touchstart', handleResizeTouchStart, { passive: false });
    }

    function updateSelectionBox() {
        selectionBox.style.left = `${selection.x}px`;
        selectionBox.style.top = `${selection.y}px`;
        selectionBox.style.width = `${selection.width}px`;
        selectionBox.style.height = `${selection.height}px`;
    }

    function startDrag(e) {
        if (e.target.classList.contains('resize-handle')) {
            return;
        }

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        selection.startX = selection.x;
        selection.startY = selection.y;

        e.preventDefault();
    }

    function handleDrag(e) {
        if (!isDragging && !isResizing) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (isDragging) {
            let newX = selection.startX + dx;
            let newY = selection.startY + dy;

            newX = Math.max(0, Math.min(newX, sourceCanvas.width - selection.width));
            newY = Math.max(0, Math.min(newY, sourceCanvas.height - selection.height));

            selection.x = newX;
            selection.y = newY;
        } else if (isResizing) {
            const ratio = crop_ratio[0] / crop_ratio[1];
            let newWidth = selection.startWidth + dx;
            let newHeight = newWidth / ratio;

            newWidth = Math.max(selection.minWidth, Math.min(newWidth, sourceCanvas.width - selection.x));
            newHeight = Math.max(selection.minHeight, Math.min(newHeight, sourceCanvas.height - selection.y));

            if (newWidth / ratio > sourceCanvas.height - selection.y) {
                newHeight = sourceCanvas.height - selection.y;
                newWidth = newHeight * ratio;
            }
            if (newHeight * ratio > sourceCanvas.width - selection.x) {
                newWidth = sourceCanvas.width - selection.x;
                newHeight = newWidth / ratio;
            }

            selection.width = newWidth;
            selection.height = newHeight;
        }

        updateSelectionBox();
    }

    function endDrag() {
        isDragging = false;
        isResizing = false;
    }

    function startResize(e) {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;

        selection.startX = selection.x;
        selection.startY = selection.y;
        selection.startWidth = selection.width;
        selection.startHeight = selection.height;

        e.preventDefault();
    }

    function handleTouchStart(e) {
        if (e.touches.length > 1) return;

        const touch = e.touches[0];
        const target = touch.target;

        if (target.classList.contains('resize-handle')) {
            handleResizeTouchStart(e);
            return;
        }

        isDragging = true;
        startX = touch.clientX;
        startY = touch.clientY;

        selection.startX = selection.x;
        selection.startY = selection.y;

        e.preventDefault();
    }

    function handleTouchMove(e) {
        if (!isDragging && !isResizing) return;

        if (e.touches.length > 1) return;

        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        if (isDragging) {
            let newX = selection.startX + dx;
            let newY = selection.startY + dy;

            newX = Math.max(0, Math.min(newX, sourceCanvas.width - selection.width));
            newY = Math.max(0, Math.min(newY, sourceCanvas.height - selection.height));

            selection.x = newX;
            selection.y = newY;
        } else if (isResizing) {
            const ratio = crop_ratio[0] / crop_ratio[1];
            let newWidth = selection.startWidth + dx;
            let newHeight = newWidth / ratio;

            newWidth = Math.max(selection.minWidth, Math.min(newWidth, sourceCanvas.width - selection.x));
            newHeight = Math.max(selection.minHeight, Math.min(newHeight, sourceCanvas.height - selection.y));

            if (newWidth / ratio > sourceCanvas.height - selection.y) {
                newHeight = sourceCanvas.height - selection.y;
                newWidth = newHeight * ratio;
            }
            if (newHeight * ratio > sourceCanvas.width - selection.x) {
                newWidth = sourceCanvas.width - selection.x;
                newHeight = newWidth / ratio;
            }

            selection.width = newWidth;
            selection.height = newHeight;
        }

        updateSelectionBox();
        e.preventDefault();
    }

    function handleTouchEnd() {
        isDragging = false;
        isResizing = false;
    }

    function handleResizeTouchStart(e) {
        if (e.touches.length > 1) return;

        isResizing = true;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;

        selection.startX = selection.x;
        selection.startY = selection.y;
        selection.startWidth = selection.width;
        selection.startHeight = selection.height;

        e.preventDefault();
    }

    function cropImage() {
        // 计算高分辨率canvas上的裁剪区域
        const highResX = selection.x * scaleX;
        const highResY = selection.y * scaleY;
        const highResWidth = selection.width * scaleX;
        const highResHeight = selection.height * scaleY;

        // 计算输出分辨率
        const outputWidth = outputResolution || highResWidth; // 默认使用原始裁剪宽度
        const outputHeight = outputWidth * (crop_ratio[1] / crop_ratio[0]); // 根据比例计算高度

        // 在高分辨率canvas上裁剪
        croppedCanvas.width = outputWidth;
        croppedCanvas.height = outputHeight;
        const ctx = croppedCanvas.getContext('2d');

        // 创建临时canvas确保图像质量
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = highResWidth;
        tempCanvas.height = highResHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // 绘制裁剪区域到临时canvas
        tempCtx.drawImage(
            highResCanvas,
            highResX, highResY, highResWidth, highResHeight,
            0, 0, highResWidth, highResHeight
        );

        // 将临时canvas内容绘制到输出canvas，应用质量设置
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            tempCanvas,
            0, 0, highResWidth, highResHeight,
            0, 0, outputWidth, outputHeight
        );

        croppedCanvas.style.display = 'block';
    }

    function uploadImage() {
        croppedCanvas.toBlob((blob) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const base64data = e.target.result;
                get_fetch({
                    api: 'set_upload_pic',
                    token: localStorage.getItem('token'),
                    data: base64data,
                    mode: mode
                }, (e) => {
                    const Data = JSON.parse(e);
                    if (Data.code === 10401) {
                        updateLoginStatus();
                        return;
                    }
                    if (Data.code === 10200) {
                        document.querySelector('.userAvatar_img').src += "?v" + new Date().getTime();
                        document.querySelector('.userBackground_img').src += "?v" + new Date().getTime();
                        document.querySelector('.avatar').src += "?v" + new Date().getTime();
                        document.querySelector('.background img').src += "?v" + new Date().getTime();
                    }
                })

                if (typeof close === 'function') {
                    close();
                }
            };
            reader.readAsDataURL(blob);
        }, 'image/jpeg', quality);
    }

    return Cropper;
};


/**
 * 加密字符串
 * @param {string} plaintext - 要加密的字符串
 * @param {string} password - 加密密码
 * @returns {Promise<Uint8Array>} 返回组合后的密文
 */
async function encrypt(plaintext, password) {
    const encoder = new TextEncoder();

    // 1. 随机生成盐（16字节）和 IV（12字节）
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 2. 从密码 + 盐派生 AES 密钥
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    // 3. 加密
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoder.encode(plaintext)
    );

    // 4. 组合密文：salt (16字节) + IV (12字节) + 实际密文
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return combined;
}

/**
 * 解密字符串
 * @param {Uint8Array} combinedCiphertext - 组合后的密文
 * @param {string} password - 解密密码
 * @returns {Promise<string>} 解密后的字符串
 */
async function decrypt(combinedCiphertext, password) {
    const encoder = new TextEncoder();

    // 1. 从密文提取 salt (前16字节) 和 IV (接下来12字节)
    const salt = combinedCiphertext.slice(0, 16);
    const iv = combinedCiphertext.slice(16, 16 + 12);
    const ciphertext = combinedCiphertext.slice(16 + 12);

    // 2. 从密码 + 盐派生 AES 密钥
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    // 3. 解密
    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        return false;
    }
}

//加密内容使用
async function EncryptText(text) {
    const ENC_text = await encrypt(text, localStorage.getItem('key'));
    return "Encryption=" + btoa(String.fromCharCode(...ENC_text));
}

//解密内容使用
async function DecryptText(text, key) {
    const Key = key ?? localStorage.getItem('key');
    const bytes = new Uint8Array([...atob(text.substring(11))].map(c => c.charCodeAt(0))); // 转 Uint8Array
    const result = await decrypt(bytes, Key);
    if (result !== false) {
        window._EncryptErr = false;
        return result;
    } else {
        console.error('内容解密失败:');
        window._EncryptErr = true;
        return text;
    }
}




// ============================================================================



/**
 * 加密图片数据（支持File或HTMLCanvasElement）并将加密数据追加到带水印的PNG文件末尾
 * @param {File|HTMLCanvasElement} fileOrCanvas - 要加密的图片文件对象或canvas元素
 * @param {string} key64 - 64字符的Base64编码密钥（实际会使用前32字节作为AES-256密钥）
 * @param {string|HTMLCanvasElement} watermark - 水印图片URL或canvas元素（正方形图片将不缩放，非正方形将调整为原始图片最短边长的一半）
 * @param {number} quality - 压缩质量 0-1 默认1
 * @returns {Promise<string>} 返回包含水印图片和加密数据的Base64字符串
 */
async function encryptImage(fileOrCanvas, key64, watermark, quality = 1) {
    return new Promise(async (resolve, reject) => {
        try {
            let originalImage, originalWidth, originalHeight;

            // 处理输入：可以是File对象或canvas元素
            if (fileOrCanvas instanceof HTMLCanvasElement) {
                // 如果是canvas，直接使用
                originalWidth = fileOrCanvas.width;
                originalHeight = fileOrCanvas.height;
                originalImage = fileOrCanvas;
            } else if (fileOrCanvas instanceof File) {
                // 如果是File，读取为ImageBitmap
                originalImage = await createImageBitmap(fileOrCanvas);
                originalWidth = originalImage.width;
                originalHeight = originalImage.height;
            } else {
                throw new Error("输入必须是File对象或HTMLCanvasElement");
            }

            // 判断是否为正方形
            const isSquare = originalWidth === originalHeight;

            // 计算水印尺寸：正方形使用原尺寸，非正方形使用最短边的一半
            let watermarkSize;
            if (isSquare) {
                watermarkSize = originalWidth; // 使用原尺寸
            } else {
                const minSide = Math.min(originalWidth, originalHeight);
                watermarkSize = Math.floor(minSide / 2); // 使用最短边的一半
            }

            // 处理水印：可以是URL字符串或canvas元素
            let watermarkImage;
            if (watermark instanceof HTMLCanvasElement) {
                // 如果是canvas，直接使用
                watermarkImage = watermark;
            } else if (typeof watermark === 'string') {
                // 如果是URL字符串，获取水印图片
                const watermarkResponse = await fetch(watermark);
                const watermarkBlob = await watermarkResponse.blob();
                watermarkImage = await createImageBitmap(watermarkBlob);
            } else {
                throw new Error("水印必须是URL字符串或HTMLCanvasElement");
            }

            // 创建canvas来调整水印尺寸
            const canvas = document.createElement('canvas');
            canvas.width = originalWidth;
            canvas.height = originalHeight;
            const ctx = canvas.getContext('2d');

            // 添加白色背景
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, originalWidth, originalHeight);

            // 计算居中位置
            const dx = (originalWidth - watermarkSize) / 2;
            const dy = (originalHeight - watermarkSize) / 2;

            // 绘制调整大小后的水印（居中）
            ctx.drawImage(
                watermarkImage,
                0, 0, watermarkImage.width, watermarkImage.height,  // 源图像裁剪区域
                dx, dy, watermarkSize, watermarkSize                 // 目标绘制区域
            );

            // 将canvas转为PNG格式的ArrayBuffer（修改为：先转JPEG低质量，再转PNG）
            const watermarkPngBlob = await new Promise(async (res) => {
                // 1. 先转为低质量JPEG（压缩体积）
                const jpegBlob = await new Promise((resolveJpeg) => {
                    canvas.toBlob(
                        (blob) => resolveJpeg(blob),
                        'image/jpeg', // 转为JPEG格式
                        quality // 质量参数（0~1，值越低压缩率越高）
                    );
                });

                // 2. 将JPEG重新加载到Canvas（模拟"转回PNG"的中间步骤）
                const jpegUrl = URL.createObjectURL(jpegBlob);
                const jpegImg = await new Promise((resolveImg) => {
                    const img = new Image();
                    img.onload = () => resolveImg(img);
                    img.src = jpegUrl;
                });

                // 3. 调整Canvas尺寸并重新绘制JPEG图像
                canvas.width = jpegImg.width;
                canvas.height = jpegImg.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(jpegImg, 0, 0);

                // 4. 最终导出为PNG（此时PNG会包含JPEG压缩后的数据）
                canvas.toBlob(
                    (blob) => res(blob), // 直接返回Blob（后续再转ArrayBuffer）
                    'image/png'
                );
            });

            const watermarkBuffer = await watermarkPngBlob.arrayBuffer();

            // 3. 读取要加密的数据为ArrayBuffer（根据输入类型）
            let fileBuffer;
            if (fileOrCanvas instanceof HTMLCanvasElement) {
                // 如果是canvas，直接使用其内容
                fileBuffer = await new Promise(res =>
                    fileOrCanvas.toBlob(blob => blob.arrayBuffer().then(res), 'image/jpeg', quality)
                );
            } else {
                // 如果是File，直接读取
                fileBuffer = await fileOrCanvas.arrayBuffer();
            }

            // 4. 准备密钥（使用前32字节）
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                await stringToUint8Array(key64).then(arr => arr.slice(0, 32)),
                { name: 'AES-CBC' },
                false,
                ['encrypt']
            );

            // 5. 生成随机IV（16字节）
            const iv = window.crypto.getRandomValues(new Uint8Array(16));

            // 6. 加密数据
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-CBC',
                    iv: iv
                },
                keyMaterial,
                fileBuffer
            );

            // 7. 合并IV和加密数据
            const encryptedData = new Uint8Array(iv.length + encrypted.byteLength);
            encryptedData.set(iv, 0);
            encryptedData.set(new Uint8Array(encrypted), iv.length);

            // 8. 合并调整后的水印PNG和加密数据
            const combinedBuffer = new Uint8Array(watermarkBuffer.byteLength + encryptedData.length);
            combinedBuffer.set(new Uint8Array(watermarkBuffer), 0);
            combinedBuffer.set(encryptedData, watermarkBuffer.byteLength);

            // 9. 转换为Base64并添加状态标记
            const base64Result = uint8ArrayToBase64(combinedBuffer);
            resolve(`data:image/png;base64,${base64Result}`);
        } catch (error) {
            reject(`图片加密失败: ${error.message}`);
        }
    });
}

/**
 * 解密图片数据（从PNG文件末尾提取加密数据并解密）
 * @param {string} combinedBase64 - 包含PNG和加密数据的Base64字符串
 * @param {string} key64 - 64字符的Base64编码密钥（必须与加密时相同）
 * @returns {Promise<string>} 返回解密后的原始数据Base64字符串
 */
async function decryptImage(combinedBase64, key64) {
    return new Promise(async (resolve, reject) => {
        try {
            // 0. 清理Base64字符串（移除可能的前缀）
            const base64Data = combinedBase64.replace(/^data:.*?;status=Encrypte;base64,/, '');

            // 1. Base64解码
            const combinedData = base64ToUint8Array(base64Data);

            // 2. 尝试找到PNG文件结束位置（PNG文件以IEND块结束）
            // PNG文件签名：89 50 4E 47 0D 0A 1A 0A
            // IEND块：00 00 00 00 49 45 4E 44 AE 42 60 82
            const pngSignature = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            const iendChunk = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

            // 检查是否是有效的PNG文件
            if (combinedData.slice(0, 8).join(',') !== pngSignature.join(',')) {
                throw new Error('提供的文件不是有效的PNG文件');
            }

            // 查找IEND块的位置
            let iendPos = -1;
            for (let i = 0; i < combinedData.length - iendChunk.length; i++) {
                let match = true;
                for (let j = 0; j < iendChunk.length; j++) {
                    if (combinedData[i + j] !== iendChunk[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    iendPos = i + iendChunk.length;
                    break;
                }
            }

            if (iendPos === -1) {
                throw new Error('在文件中找不到PNG结束标记');
            }

            // 3. 提取加密数据（从IEND块之后开始）
            const encryptedData = combinedData.slice(iendPos);
            if (encryptedData.length < 16) {
                throw new Error('没有找到加密数据或数据不完整');
            }

            // 4. 提取IV（前16字节）和实际加密数据
            const iv = encryptedData.slice(0, 16);
            const data = encryptedData.slice(16);

            // 5. 准备密钥（使用前32字节）
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                await stringToUint8Array(key64).then(arr => arr.slice(0, 32)),
                { name: 'AES-CBC' },
                false,
                ['decrypt']
            );

            // 6. 解密数据
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-CBC',
                    iv: iv
                },
                keyMaterial,
                data
            );

            // 7. 返回解密后的Base64数据，添加解密状态标记
            resolve(`data:image/webp;status=Decrypte;base64,${uint8ArrayToBase64(new Uint8Array(decrypted))}`);
        } catch (error) {
            reject(`图片解密失败: ${error.message}`);
        }
    });
}


// 辅助函数：字符串转Uint8Array
function stringToUint8Array(str) {
    return new Promise((resolve) => {
        const blob = new Blob([str]);
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result));
        reader.readAsArrayBuffer(blob);
    });
}

// 辅助函数：Uint8Array转Base64
function uint8ArrayToBase64(bytes) {
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return window.btoa(binary);
}

// 辅助函数：Base64转Uint8Array
function base64ToUint8Array(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * 将 Base64 字符串转换为 File 对象
 * @param {string} base64String - Base64 编码的字符串（可带可不带 Data URL 前缀）
 * @param {string} filename - 输出的文件名
 * @param {string} [fallbackMimeType] - 可选的备用 MIME 类型（如果无法自动检测）
 * @returns {File}
 */
function base64ToFile(base64String, filename, fallbackMimeType = 'application/octet-stream') {
    // 1. 尝试从 Data URL 提取 MIME 类型（如果输入是 Data URL）
    let mimeType = fallbackMimeType;
    let pureBase64 = base64String;

    if (base64String.startsWith('data:')) {
        const dataUrlMatch = base64String.match(/^data:(.*?)(;base64)?,/);
        if (dataUrlMatch && dataUrlMatch[1]) {
            mimeType = dataUrlMatch[1];
        }
        pureBase64 = base64String.split(',')[1]; // 移除 Data URL 前缀
    }

    // 2. 如果仍然没有 MIME 类型，尝试从文件名推测
    if (mimeType === 'application/octet-stream' && filename) {
        const extension = filename.split('.').pop().toLowerCase();
        mimeType = getMimeTypeFromExtension(extension) || fallbackMimeType;
    }

    // 3. 解码 Base64 并构建 File 对象
    const byteString = atob(pureBase64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }

    return new File([arrayBuffer], filename, { type: mimeType });
}

/**
 * 根据文件扩展名推测 MIME 类型
 * @param {string} extension - 文件扩展名（如 "png", "jpg"）
 * @returns {string|null}
 */
function getMimeTypeFromExtension(extension) {
    const mimeTypes = {
        'txt': 'text/plain',
        'csv': 'text/csv',
        'json': 'application/json',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'xml': 'application/xml',
        'js': 'text/javascript',
        'css': 'text/css',
        'html': 'text/html',
    };
    return mimeTypes[extension] || null;
}

/**
 * 将URL转换为Base64编码
 * @param {string} url - 要转换的URL
 * @returns {Promise<string>} 返回一个Promise，解析为Base64编码的字符串
 */
async function urlToBase64(url) {
    try {
        // 1. 获取URL资源
        const response = await fetch(url);

        // 检查响应是否成功
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 2. 读取为Blob对象
        const blob = await response.blob();

        // 3. 将Blob转换为Base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]); // 移除data URI前缀
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        if (error.message === 'Failed to fetch') {
            showBubble('请尝试启用CORS', 'error', 5000);
            console.error('捕获到 CORS 错误:', error);
        } else {
            console.error('Error converting URL to Base64:', error);
        }
        throw error;
    }
}

/**
 * 辅助函数：加载图片
 * @param {string} src - 图片URL
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // 处理跨域问题
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = src;
    });
}

/**
 * 将 Canvas 转换为 Base64 字符串
 * @param {HTMLCanvasElement} canvas - 要转换的 Canvas 元素
 * @returns {string} Base64 字符串
 */
function canvasToBase64(canvas) {
    try {
        // 检查 canvas 是否是有效的 HTMLCanvasElement
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('参数必须是一个 HTMLCanvasElement');
        }
        // 转换为 Base64
        base64 = canvas.toDataURL('image/png');
        return base64;
    } catch (error) {
        console.error('Canvas 转 Base64 失败:', error);
        throw error; // 重新抛出错误以便调用者处理
    }
}

/**
 * 将图片裁剪为正方形（居中裁剪）并控制输出分辨率
 * @param {File} file - 图片文件
 * @param {number} [maxResolution] - 可选，输出图片的最大边长（像素），不传则保持原尺寸
 * @returns {Promise<HTMLCanvasElement>} 包含裁剪后图片的canvas元素
 */
async function cropImageToSquare(file, maxResolution = 260) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            try {
                // 创建正方形canvas（边长=图片最短边）
                const originalSize = Math.min(img.width, img.height);
                let outputSize = originalSize;

                // 如果指定了最大分辨率且小于原始尺寸，则按比例缩小
                if (maxResolution && maxResolution < originalSize) {
                    outputSize = maxResolution;
                }

                const canvas = document.createElement('canvas');
                canvas.width = outputSize;
                canvas.height = outputSize;
                const ctx = canvas.getContext('2d');

                // 计算裁剪区域（居中）
                const dx = (img.width > img.height) ? (img.width - img.height) / 2 : 0;
                const dy = (img.height > img.width) ? (img.height - img.width) / 2 : 0;
                const drawSize = (img.width > img.height) ? img.height : img.width;

                // 如果需要缩小分辨率，计算缩放比例
                if (outputSize !== originalSize) {
                    const scale = outputSize / originalSize;
                    ctx.drawImage(
                        img,
                        dx, dy, drawSize, drawSize, // 源裁剪区域
                        0, 0, outputSize, outputSize // 目标绘制区域（已缩放）
                    );
                } else {
                    // 直接绘制，不缩放
                    ctx.drawImage(
                        img,
                        dx, dy, drawSize, drawSize, // 源裁剪区域
                        0, 0, outputSize, outputSize // 目标绘制区域
                    );
                }

                resolve(canvas);
            } catch (error) {
                reject(new Error(`图片裁剪失败: ${error.message}`));
            } finally {
                URL.revokeObjectURL(url);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('图片加载失败'));
        };

        img.src = url;
    });
}

/**
 * 对canvas应用模糊效果
 * @param {HTMLCanvasElement} canvas - 包含图片的canvas元素
 * @param {number} blurStrength - 模糊程度（0-1的小数，表示相对于图片尺寸的百分比）
 * @returns {HTMLCanvasElement} 处理后的canvas元素
 */
function applyBlur(canvas, blurStrength = 0.1) {
    const size = Math.min(canvas.width, canvas.height); // 处理非正方形情况
    const ctx = canvas.getContext('2d');
    const blurRadius = Math.max(1, size * blurStrength);

    // 方法1: 使用Canvas的filter属性 (首选方法)
    if (ctx.filter) {
        // 创建临时画布处理边缘
        const padding = Math.ceil(blurRadius) * 2;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = size + padding * 2;
        tempCanvas.height = size + padding * 2;

        // 绘制原图到临时画布中央
        tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height,
            padding, padding, size, size);

        // 扩展边缘像素
        extendCanvasEdges(tempCtx, canvas, padding, size);

        // 应用模糊
        tempCtx.filter = `blur(${blurRadius}px)`;
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';

        // 绘制回主canvas
        ctx.drawImage(
            tempCanvas,
            padding, padding, size, size,
            0, 0, canvas.width, canvas.height
        );

        return canvas;
    }

    // 方法2: 手动实现模糊效果 (兼容旧浏览器)
    return applyManualBlur(canvas, blurRadius / 0.5);
}

/**
 * 扩展canvas边缘像素（辅助函数）
 * @param {CanvasRenderingContext2D} ctx - 临时canvas的上下文
 * @param {HTMLCanvasElement} sourceCanvas - 源canvas
 * @param {number} padding - 边缘扩展大小
 * @param {number} size - canvas尺寸
 */
function extendCanvasEdges(ctx, sourceCanvas, padding, size) {
    // 左上角
    ctx.drawImage(sourceCanvas, 0, 0, 1, 1, 0, 0, padding, padding);
    // 右上角
    ctx.drawImage(sourceCanvas, sourceCanvas.width - 1, 0, 1, 1, size + padding, 0, padding, padding);
    // 左下角
    ctx.drawImage(sourceCanvas, 0, sourceCanvas.height - 1, 1, 1, 0, size + padding, padding, padding);
    // 右下角
    ctx.drawImage(sourceCanvas, sourceCanvas.width - 1, sourceCanvas.height - 1, 1, 1, size + padding, size + padding, padding, padding);

    // 上下边缘
    for (let i = 0; i < size; i++) {
        // 上边缘
        ctx.drawImage(sourceCanvas, i, 0, 1, 1, i + padding, 0, 1, padding);
        // 下边缘
        ctx.drawImage(sourceCanvas, i, sourceCanvas.height - 1, 1, 1, i + padding, size + padding, 1, padding);
    }

    // 左右边缘
    for (let i = 0; i < size; i++) {
        // 左边缘
        ctx.drawImage(sourceCanvas, 0, i, 1, 1, 0, i + padding, padding, 1);
        // 右边缘
        ctx.drawImage(sourceCanvas, sourceCanvas.width - 1, i, 1, 1, size + padding, i + padding, padding, 1);
    }
}

//手动模糊
function applyManualBlur(canvas, radius = 3) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 创建高斯核
    const kernel = createGaussianKernel(radius);
    const kernelSize = kernel.length;
    const halfKernel = Math.floor(kernelSize / 2);

    // 临时canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    // 水平模糊
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const output = new Uint8ClampedArray(pixels.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, weightSum = 0;

            for (let i = -halfKernel; i <= halfKernel; i++) {
                const px = Math.min(width - 1, Math.max(0, x + i));
                const idx = (y * width + px) * 4;
                const weight = kernel[i + halfKernel];

                r += pixels[idx] * weight;
                g += pixels[idx + 1] * weight;
                b += pixels[idx + 2] * weight;
                a += pixels[idx + 3] * weight;
                weightSum += weight;
            }

            const outIdx = (y * width + x) * 4;
            output[outIdx] = r / weightSum;
            output[outIdx + 1] = g / weightSum;
            output[outIdx + 2] = b / weightSum;
            output[outIdx + 3] = a / weightSum;
        }
    }

    // 垂直模糊（直接在原数组操作）
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let r = 0, g = 0, b = 0, a = 0, weightSum = 0;

            for (let i = -halfKernel; i <= halfKernel; i++) {
                const py = Math.min(height - 1, Math.max(0, y + i));
                const idx = (py * width + x) * 4;
                const weight = kernel[i + halfKernel];

                r += output[idx] * weight;
                g += output[idx + 1] * weight;
                b += output[idx + 2] * weight;
                a += output[idx + 3] * weight;
                weightSum += weight;
            }

            const outIdx = (y * width + x) * 4;
            pixels[outIdx] = r / weightSum;
            pixels[outIdx + 1] = g / weightSum;
            pixels[outIdx + 2] = b / weightSum;
            pixels[outIdx + 3] = a / weightSum;
        }
    }

    tempCtx.putImageData(new ImageData(pixels, width, height), 0, 0);
    ctx.drawImage(tempCanvas, 0, 0);
    return canvas;
}

// 创建高斯核
function createGaussianKernel(radius) {
    const size = radius * 2 + 1;
    const kernel = new Array(size);
    const sigma = radius / 2;
    let sum = 0;

    for (let i = 0; i < size; i++) {
        const x = i - radius;
        kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        sum += kernel[i];
    }

    return kernel.map(v => v / sum);
}

/**
 * 对canvas添加水印
 * @param {HTMLCanvasElement} canvas - 包含图片的canvas元素
 * @param {string} watermarkUrl - 水印图片URL
 * @returns {Promise<HTMLCanvasElement>} 处理后的canvas元素
 */
async function applyWatermark(canvas, watermarkUrl) {
    if (!watermarkUrl) return canvas;

    const ctx = canvas.getContext('2d');
    const size = canvas.width;

    try {
        const watermarkImg = await loadImage(watermarkUrl);
        const watermarkSize = size / 2;
        const x = (size - watermarkSize) / 2;
        const y = (size - watermarkSize) / 2;

        ctx.globalAlpha = 0.5;
        ctx.drawImage(
            watermarkImg,
            0, 0, watermarkImg.width, watermarkImg.height,
            x, y, watermarkSize, watermarkSize
        );
        ctx.globalAlpha = 1;
    } catch (watermarkError) {
        showBubble('加密失败！请尝试启用CORS', 'error', 5000);
        console.warn('水印加载失败', watermarkError);
    }

    return canvas;
}

/**
 * 对图片应用模糊效果并添加水印（主函数）
 * @param {HTMLCanvasElement} canvas - 包含图片的canvas元素
 * @param {number} blurStrength - 模糊程度（0-1的小数，表示相对于图片尺寸的百分比）
 * @param {string} watermarkUrl - 水印图片URL
 * @returns {Promise<HTMLCanvasElement>} 处理后的canvas元素
 */
async function applyBlurAndWatermark(canvas, blurStrength = 0.1, watermarkUrl) {
    // 先应用模糊
    applyBlur(canvas, blurStrength);

    // 再添加水印
    await applyWatermark(canvas, watermarkUrl);

    return canvas;
}
/**
 * 处理图片文件：裁剪为正方形，添加居中水印
 * @param {File} file - 图片文件
 * @param {number} blur - 模糊程度（0-1的小数，表示相对于图片尺寸的百分比）
 * @param {string} watermarkUrl - 水印图片URL
 * @returns {Promise<HTMLCanvasElement>} 处理后的canvas元素
 */
async function processImageWithWatermark(file, blur = 0.1, watermarkUrl) {
    try {
        // 1. 裁剪为正方形
        const squareCanvas = await cropImageToSquare(file);

        // 2. 应用模糊和水印
        const processedCanvas = await applyBlurAndWatermark(squareCanvas, blur, watermarkUrl);


        return processedCanvas;
    } catch (error) {
        throw new Error(`图片处理失败: ${error.message}`);
    }
}


/**
 * 获取图片Blob
 * @param {string} src 图片src
 * @returns {Promise<Blob>} 返回blob
 */
async function get_img(src) {
    const result = await fetch('/kernel/api.php', {
        method: "POST",
        body: new URLSearchParams({
            api: 'get_img',
            url: src,
            token: localStorage.getItem('token')
        })
    }).then(response => {
        if (!response.ok) throw new Error('Failed to load image');
        return response.blob(); // 获取图片的Blob对象
    })
        .then(blob => {
            const imageUrl = URL.createObjectURL(blob); // 创建临时URL
            return imageUrl;
        })
        .catch(error => console.error('Error:', error));
    return result;
}

// ===========================================================






/**
 * 屏蔽回车键（Enter）的函数
 * @param {HTMLElement|string} [element] - 可选，指定要屏蔽的 DOM 元素或选择器（如 "#input"），不传则全局屏蔽
 * @param {Function} [callback] - 可选，触发回车键时的回调函数
 */
function disableEnterKey(element, callback) {
    // 处理参数：如果 element 是字符串（选择器），则查询 DOM
    const target = typeof element === 'string'
        ? document.querySelector(element)
        : element;

    // 事件处理函数
    const handler = function (event) {
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault(); // 阻止默认行为
            callback && callback(event); // 执行回调（如果有）
        }
    };

    // 绑定事件：如果指定了元素，则绑定到该元素；否则全局绑定
    if (target) {
        target.addEventListener('keydown', handler);
    } else {
        document.addEventListener('keydown', handler);
    }

    // 返回一个解绑函数，方便后续移除监听
    return function () {
        if (target) {
            target.removeEventListener('keydown', handler);
        } else {
            document.removeEventListener('keydown', handler);
        }
    };
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 根据 File 对象返回大类（图片/动画图片/视频）
 * @param {File} file - 文件对象（如从 <input type="file"> 获取）
 * @returns {Promise<string>} - 返回大类："jpg"、"gif"、"video" 或 "unknown"
 */
async function getFileCategory(file) {
    if (!file || !(file instanceof File)) {
        return 'unknown';
    }

    // 1. 提取文件后缀名（小写）
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop() || '';

    // 2. 定义各类别的扩展名和 MIME 类型映射
    const categories = {
        jpg: {
            extensions: ['jpg', 'jpeg', 'jpe', 'png', 'webp', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'avif', 'raw', 'svg'],
            mimeTypes: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/bmp',
                'image/tiff',
                'image/heic',
                'image/heif',
                'image/avif',
                'image/svg+xml',
            ],
        },
        gif: {
            extensions: ['gif'],
            mimeTypes: ['image/gif'],
        },
        video: {
            extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'rmvb', 'wmv', '3gp', 'm4v', 'ts', 'vob', 'av1'],
            mimeTypes: [
                'video/mp4',
                'video/quicktime', // .mov
                'video/x-matroska', // .mkv
                'video/webm',
                'video/3gpp', // .3gp
                'video/x-msvideo', // .avi
                'video/x-ms-wmv', // .wmv
            ],
        },
    };

    // 3. 检查扩展名和 MIME 类型是否匹配
    for (const [category, { extensions, mimeTypes }] of Object.entries(categories)) {
        if (extensions.includes(extension) && mimeTypes.includes(file.type)) {
            return category;
        }
    }

    // 4. 特殊情况处理：某些格式（如 .heic）的 MIME 类型可能不标准
    if (extension === 'heic' || extension === 'heif') {
        return 'image'; // 即使 MIME 类型不匹配，也按图片处理
    }

    // 5. 如果扩展名或 MIME 类型未匹配，返回 unknown
    return 'unknown';
}

/**
 * 将 File 对象转换为 Base64，并返回 Promise
 * @param {File} file - 文件对象（如从 <input type="file"> 获取）
 * @returns {Promise<string>} - Base64 字符串（如 "data:image/jpeg;base64,/9j/4AAQSk..."）
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file); // 读取为 Data URL（Base64 格式）
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}

/**
 * 获取视频缩略图（兼容 iOS Safari）
 * @param {File} videoFile - 视频文件对象
 * @param {Object} [options] - 配置项
 * @param {number} [options.time=0] - 捕获时间点（秒）
 * @param {string} [options.type='image/jpeg'] - 输出格式
 * @param {number} [options.quality=0.9] - 图片质量（0~1）
 * @returns {Promise<string>} - Base64 Data URL
 */
function videoToThumbnailBase64(videoFile, options = {}) {
    const { time = 0, type = 'image/jpeg', quality = 0.1 } = options;

    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(videoFile);

        video.src = url;
        video.muted = true;
        video.playsInline = true; // 关键：iOS 需要 playsInline
        video.setAttribute('playsinline', 'true'); // 兼容旧版本
        video.crossOrigin = 'anonymous';

        // 强制预加载元数据（iOS 可能不会自动触发 loadedmetadata）
        video.addEventListener('loadedmetadata', () => {
            // iOS 需要用户交互后才能加载视频数据，这里尝试播放然后立即暂停
            video.play()
                .then(() => video.pause())
                .catch(() => {
                    // 如果自动播放被阻止，尝试通过静音播放绕过（iOS 可能仍会失败）
                    video.muted = true;
                    return video.play().then(() => video.pause());
                });
        });

        // 监听 canplay 事件（iOS 更可能在此阶段准备好帧数据）
        video.addEventListener('canplay', () => {
            // 确保时间点有效（iOS 的 duration 可能为 NaN）
            const seekTime = isNaN(video.duration) ? 0 : Math.min(time, video.duration - 0.1);
            video.currentTime = seekTime;
        }, { once: true });

        video.addEventListener('seeked', () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640; // 默认宽度（iOS 可能无法立即获取）
                canvas.height = video.videoHeight || 480; // 默认高度
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(
                    (blob) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            URL.revokeObjectURL(url);
                            resolve(reader.result);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    },
                    type,
                    quality
                );
            } catch (error) {
                reject(error);
            }
        }, { once: true });

        video.addEventListener('error', () => {
            // 尝试通过加载元数据后直接捕获（备用方案）
            if (!video.videoWidth) {
                // iOS 可能无法读取视频信息，使用默认尺寸
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#000'; // 填充黑色背景（避免透明）
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.font = '20px Arial';
                ctx.fillStyle = '#fff';
                ctx.fillText('Thumbnail Failed', 50, 100);
                resolve(canvas.toDataURL(type, quality));
            }
            URL.revokeObjectURL(url);
            reject(new Error('视频处理失败（可能为 iOS 限制）'));
        }, { once: true });
    });
}

/**
 * 编辑器内容 链接替换（修复 URL 错误）
 */
function editor_content_replace() {
    const editableDiv = getDomFromId('editor_content');
    let isProcessing = false;

    editableDiv.addEventListener('input', function (e) {
        if (isProcessing) return;
        isProcessing = true;
        switch (e.data) {
            case ')':
                _link(editableDiv);
                //link
                break;
            case '*':
                _block(editableDiv);
                break;
            default:
                break;
        }

        // 处理内容
        isProcessing = false;
    });

    function _link(editableDiv) {
        // 改进的正则表达式，匹配 ![text](url) 或 ![text](相对路径)
        const regex = /!\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;
        const html = editableDiv.innerHTML;

        // 临时替换所有匹配项，避免嵌套替换问题
        let tempHtml = html;
        const replacements = [];
        let match;

        // 收集所有匹配项
        while ((match = regex.exec(html)) !== null) {
            const fullMatch = match[0];
            const displayText = match[1];
            let url = match[2];

            // 修复错误的 URL（例如 Twitter 链接）
            url = fixBrokenUrl(url);

            // 生成唯一占位符，避免冲突
            const placeholder = `@@@LINK_PLACEHOLDER_${replacements.length}@@@`;

            replacements.push({
                placeholder,
                displayText,
                url
            });

            // 替换为占位符（避免正则重复匹配）
            tempHtml = tempHtml.replace(fullMatch, placeholder);
        }

        if (replacements.length === 0) return;

        // 替换占位符为 <a> 标签
        let resultHtml = tempHtml;
        replacements.forEach(replacement => {
            const { placeholder, displayText, url } = replacement;
            const aTag = `<a href="${url}" target="_blank">${displayText}</a>`;
            resultHtml = resultHtml.split(placeholder).join(aTag);
        });
        editableDiv.innerHTML = resultHtml;

        moveCursorToEnd(editableDiv);
    }

    function _block(editableDiv) {
        const innerHTML = editableDiv.innerHTML || "";

        const asteriskPairs = (innerHTML.match(/\*\*/g) || []).length;

        if (asteriskPairs === 2) {
            const formatted = innerHTML.replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>\u200B');

            if (formatted !== editableDiv.innerHTML) {
                editableDiv.innerHTML = formatted;
                moveCursorToEnd(editableDiv);
            }
        }

    }

    /**
     * 修复错误的 URL（例如 Twitter 链接）
     * @param {string} url - 原始 URL
     * @returns {string} - 修复后的 URL
     */
    function fixBrokenUrl(url) {
        // 示例：修复 Twitter 链接（如果被错误解析）
        if (url.includes("twitter.com") && !url.startsWith("http")) {
            return `https://${url}`;
        }

        // 其他 URL 修复逻辑...
        return url;
    }
}

/**
 * 设置粘贴事件监听，处理粘贴内容
 * @param {HTMLElement} editableElement - 可编辑元素（如 contenteditable 的 div）
 */
function handlePaste(editableElement) {
    editableElement.addEventListener('paste', (e) => {
        e.preventDefault();

        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData('text/plain');
        let pastedHTML = clipboardData.getData('text/html');

        // 移除 <!--StartFragment--> 和 <!--EndFragment--> 注释
        if (pastedHTML) {
            pastedHTML = pastedHTML
                .replace(/<!--StartFragment-->/g, '')
                .replace(/<!--EndFragment-->/g, '');
        }

        // 调用 sanitizeContent 进行严格过滤
        const processedContent = sanitizeContent(pastedHTML || pastedText, pastedHTML !== '');

        // 插入处理后的内容
        insertContentAtCursor(editableElement, processedContent.trim());
    });
}

/**
 * 严格过滤 HTML 内容，移除危险标签和属性，但保留 <br> 换行
 * @param {string} content - 待过滤的内容（HTML 或纯文本）
 * @param {boolean} isHTML - 是否为 HTML 格式
 * @returns {string} 过滤后的安全内容
 */
function sanitizeContent(content, isHTML) {
    if (!isHTML) {
        // 如果是纯文本，替换换行符为 <br> 并返回
        return content.replace(/\n/g, '<br>');
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    // 允许的标签和属性
    const allowedTags = ['a', 'br', 'strong', 'em', 'b', 'i', 'u', 's'];
    const allowedAttrs = {
        a: ['href', 'target', 'rel', 'download', 'hreflang', 'type'],
    };

    // 额外处理：在连续的 <p> 标签间插入 <br>
    const paragraphs = tempDiv.querySelectorAll('p');
    for (let i = 0; i < paragraphs.length - 1; i++) {
        const currentP = paragraphs[i];
        const nextSibling = currentP.nextSibling;
        // 如果下一个节点不是 <p>，则跳过
        if (!nextSibling || nextSibling.tagName?.toLowerCase() !== 'p') continue;
        // 在当前 <p> 后插入 <br>
        currentP.insertAdjacentHTML('afterend', '<br>');
    }

    // 遍历所有元素，移除危险标签和属性
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(el => {
        const tagName = el.tagName.toLowerCase();

        // 1. 如果标签不在允许列表中，移除标签但保留内容
        if (!allowedTags.includes(tagName)) {
            const parent = el.parentNode;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
            return;
        }

        // 2. 移除所有非白名单属性
        const attributesToRemove = [];
        for (const attr of el.attributes) {
            const attrName = attr.name.toLowerCase();
            const isAllowed = allowedAttrs[tagName]?.includes(attrName);
            if (!isAllowed) {
                attributesToRemove.push(attrName);
            }
        }

        // 3. 强制移除 style 和其他危险属性
        attributesToRemove.forEach(attrName => {
            el.removeAttribute(attrName);
        });
        el.removeAttribute('style'); // 确保 style 被移除
    });

    return tempDiv.innerHTML;
}

/**
 * 在光标位置插入处理后的内容
 * @param {HTMLElement} editableElement - 可编辑元素
 * @param {string} content - 要插入的内容（HTML 或纯文本）
 */
function insertContentAtCursor(editableElement, content) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
    }

    range.insertNode(fragment);

    // 移动光标到插入内容的末尾
    const newRange = document.createRange();
    if (fragment.lastChild) {
        newRange.setStartAfter(fragment.lastChild);
    } else {
        newRange.setStart(range.endContainer, range.endOffset);
    }
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

/**
 * 替换浏览器默认换行行为，并确保末尾始终有至少一个<br>
 * @param {HTMLElement} dom - 可编辑的div元素
 */
function setupEditableDiv(dom) {
    // 确保dom是可编辑的
    dom.contentEditable = true;

    // 初始检查：如果内容为空，添加一个<br>
    if (dom.innerHTML === '') {
        dom.innerHTML = '<br>';
    }

    dom.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            insertCustomBreak(dom);
        }


        // 插入三个空格（仅当光标紧挨着BR标签时）
        if (e.key === ' ') {
            // 保存当前光标位置
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);

            // 检查光标是否紧挨着BR标签
            let isAfterBR = false;
            const startContainer = range.startContainer;
            const startOffset = range.startOffset;

            // 情况1：光标在文本节点中
            if (startContainer.nodeType === Node.TEXT_NODE) {
                // 如果文本节点是BR标签的下一个兄弟节点，且光标在文本节点的开头
                if (startContainer.previousSibling && startContainer.previousSibling.nodeName === 'BR' && startOffset === 0) {
                    isAfterBR = true;
                }
            }
            // 情况2：光标直接在某个节点后面（非文本节点）
            else {
                // 检查前一个节点是否是BR标签
                const previousNode = startContainer.previousSibling;
                if (previousNode && previousNode.nodeName === 'BR') {
                    isAfterBR = true;
                }
            }

            // 只有紧挨着BR标签时才处理
            if (isAfterBR) {
                // 阻止默认空格行为
                e.preventDefault();

                // 插入三个全角空格（\u3000是中文全角空格）
                let spaces = '\u00A0\u00A0\u00A0'; // 三个全角空格
                !isIOS() ? spaces += '\u00A0' : '';

                // 如果光标在文本节点中
                if (startContainer.nodeType === Node.TEXT_NODE) {
                    // 检查前一个节点是否是BR标签，并且不是连续多个BR中的最后一个
                    let previousNode = startContainer.previousSibling;
                    if (previousNode && previousNode.nodeName === 'BR') {
                        // 如果前一个节点是BR，且它的前一个节点也是BR，说明有多个连续BR
                        // 我们需要找到第一个BR
                        while (previousNode.previousSibling && previousNode.previousSibling.nodeName === 'BR') {
                            previousNode = previousNode.previousSibling;
                        }

                        // 在第一个BR后面插入文本节点
                        const textNode = document.createTextNode(spaces);
                        if (previousNode.nextSibling) {
                            previousNode.parentNode.insertBefore(textNode, previousNode.nextSibling);
                        } else {
                            previousNode.parentNode.appendChild(textNode);
                        }

                        // 移动光标到新插入的文本节点之后
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        // 原始逻辑
                        const textNode = startContainer;
                        const textBefore = textNode.nodeValue.substring(0, startOffset);
                        const textAfter = textNode.nodeValue.substring(startOffset);
                        textNode.nodeValue = textBefore + spaces + textAfter;
                        const newOffset = startOffset + spaces.length;
                        range.setStart(textNode, newOffset);
                        range.setEnd(textNode, newOffset);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                } else {
                    // 如果光标不在文本节点中（例如在BR标签后面直接按空格）
                    // 检查前一个节点是否是BR标签，并且不是连续多个BR中的最后一个
                    let previousNode = startContainer.previousSibling;
                    if (previousNode && previousNode.nodeName === 'BR') {
                        // 找到第一个BR
                        while (previousNode.previousSibling && previousNode.previousSibling.nodeName === 'BR') {
                            previousNode = previousNode.previousSibling;
                        }

                        // 在第一个BR后面插入文本节点
                        const textNode = document.createTextNode(spaces);
                        if (previousNode.nextSibling) {
                            previousNode.parentNode.insertBefore(textNode, previousNode.nextSibling);
                        } else {
                            previousNode.parentNode.appendChild(textNode);
                        }

                        // 移动光标到新插入的文本节点之后
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
            }
        }

    });

    // 监听输入事件，确保末尾始终有<br>
    dom.addEventListener('input', function () {
        ensureTrailingBreak(dom);
    });
}

/**
 * 在光标位置插入自定义换行
 * @param {HTMLElement} dom
 */
function insertCustomBreak(dom) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    // 创建文档片段
    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.createElement('br'));

    // 添加一个空的文本节点（用于定位光标）
    const textNode = document.createTextNode('');
    fragment.appendChild(textNode);

    // 插入并设置光标
    range.deleteContents();
    range.insertNode(fragment);

    // 设置光标位置
    const newRange = document.createRange();
    newRange.setStart(textNode, 0);
    newRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(newRange);

    // 确保末尾有<br>
    ensureTrailingBreak(dom);
}

/**
 * 确保dom内容末尾至少有一个<br>
 * @param {HTMLElement} dom
 */
function ensureTrailingBreak(dom) {
    // 从后向前遍历子节点，跳过空的文本节点
    let lastMeaningfulNode = null;
    for (let i = dom.childNodes.length - 1; i >= 0; i--) {
        const node = dom.childNodes[i];
        if (node.nodeType === Node.TEXT_NODE) {
            // 如果是文本节点且非空，或者空文本节点但前面没有其他有意义的节点，则视为有意义
            if (node.nodeValue.trim() !== '' || i === 0) {
                lastMeaningfulNode = node;
                break;
            }
        } else {
            lastMeaningfulNode = node;
            break;
        }
    }

    // 如果最后一个有意义的节点不是<br>，或者根本没有子节点
    if (!lastMeaningfulNode ||
        (lastMeaningfulNode.nodeType !== Node.ELEMENT_NODE || lastMeaningfulNode.nodeName !== 'BR')) {
        // 清除所有空的文本节点（可选，根据需求）
        for (let i = dom.childNodes.length - 1; i >= 0; i--) {
            const node = dom.childNodes[i];
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue === '') {
                dom.removeChild(node);
            }
        }

        // 添加新的<br>
        dom.appendChild(document.createElement('br'));
    }

    // 特殊情况：如果内容为空（只有可能的空文本节点），确保只有一个<br>
    if (dom.childNodes.length === 0 ||
        (dom.childNodes.length === 1 &&
            dom.childNodes[0].nodeType === Node.TEXT_NODE &&
            dom.childNodes[0].nodeValue === '')) {
        dom.innerHTML = '<br>';
    }
}

/**
 * 判断是否为JSON格式
 * @param {JSON} str json字符串
 * @returns true or false
 */
function isJSON(str) {
    try {
        JSON.parse(str);
        return true; // 解析成功，是合法 JSON
    } catch (e) {
        return false; // 解析失败，不是合法 JSON
    }
}


function downloadFromUrl(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || url.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function PostOpen(dom, s = 0) {
    let height = dom.clientHeight;
    dom.style.maxHeight = "0px";
    setTimeout(() => {
        dom.style.maxHeight = height + "px";
        setTimeout(() => {
            dom.style.maxHeight = '';
        }, s + 350);
        dom.style.opacity = 1;
    }, s);
}

function PostClose(dom, s = 350) {
    dom.style.border = "0px";
    setTimeout(() => {
        dom.setAttribute('style', 'margin:0px !important');
        dom.style.maxHeight = "0px";
        dom.style.opacity = "0";
    }, 0);
    setTimeout(() => {
        dom.remove();
    }, s);
}

function wrapChildrenWithTag(parentElement, tagName) {
    const children = Array.from(parentElement.childNodes); // 获取所有子节点（包括文本节点）
    const p = document.createElement(tagName); // 创建 <p> 元素

    // 清空父元素，但保留子节点引用
    parentElement.innerHTML = '';

    // 将子节点添加到 <p> 中
    children.forEach(child => {
        p.appendChild(child);
    });

    // 将 <p> 添加回父元素
    parentElement.appendChild(p);
    return p;
}

/**
 * 移除html的所有属性
 * @param {html} html 内容
 * @param {array} allowedAttributes 白名单：target
 * @returns
 */
function removeAllAttributes(html, allowedAttributes = ['target', 'href']) {
    const _doc = new DOMParser().parseFromString(html, 'text/html');

    // 遍历所有元素
    _doc.querySelectorAll('*').forEach(el => {
        const attrs = el.getAttributeNames();
        attrs.forEach(attr => {
            // 如果属性不在白名单中，则移除
            if (!allowedAttributes.includes(attr)) {
                el.removeAttribute(attr);
            }
        });
    });

    return _doc.body.innerHTML;
}

/**图片拖动 */
function dragImage(mediaDom) {
    let startX = 0;
    let startY = 0;
    let isclick = false;
    let isDragging = false;
    let startDom;

    mediaDom.addEventListener('touchstart', (e) => {
        isclick = true;
        startX = e.changedTouches[0].clientX;
        startY = e.changedTouches[0].clientY;
        if (e.target.tagName == 'IMG') {
            startDom = e.target.parentElement;
        } else {
            startDom = e.target;
        }
        startDom.style.zIndex = 2;
        startDom.style.opacity = 0.8;
    })

    mediaDom.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isclick == false) return;
        const moveX = e.changedTouches[0].clientX - startX;
        const moveY = e.changedTouches[0].clientY - startY;
        if (e.target.tagName == 'IMG' && e.target.parentElement.parentElement.classList.contains('file_upload')) {
            startDom.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }
    })

    mediaDom.addEventListener('touchend', (e) => {
        startDom.style.left = "-1000%";
        const endDom = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        if (endDom.tagName == 'IMG' && endDom.closest('.file_upload')) {
            const start = startDom;
            const end = endDom.parentElement;
            const container = endDom.closest('.file_upload');
            const startIndex = Array.from(container.children).indexOf(start);
            const endIndex = Array.from(container.children).indexOf(end);


            // 验证目标元素是否在可排序容器中
            let target = null;
            if (endDom && endDom.tagName == 'IMG' && endDom.closest('.file_upload')) {
                target = endDom.parentElement;
            } else if (endDom && endDom.classList.contains('file_upload')) {
                // 如果直接拖到容器上（没有具体元素），不处理
                resetElement();
                return;
            } else if (endDom && endDom.parentElement?.classList.contains('file_upload')) {
                target = endDom;
            }

            // 如果没有有效目标或目标就是起始元素，则复位
            if (!target || target === startDom) {
                resetElement();
                return;
            }

            // 如果索引有效且不同，则交换位置
            if (startIndex !== -1 && endIndex !== -1 && startIndex !== endIndex) {
                // 在DOM中实际交换位置
                if (startIndex < endIndex) {
                    container.insertBefore(startDom, target.nextSibling);
                } else {
                    container.insertBefore(startDom, target);
                }

                // 延迟复位使动画可见
                resetElement();
                return;
            }
        }
        function resetElement() {
            startDom.style.transform = 'translate(0px, 0px)';
            startDom.style.zIndex = 0;
            startDom.style.opacity = 1;
            startDom.style.left = "";

            isclick = false;
        }
        resetElement()
    })

    mediaDom.addEventListener('mousedown', (e) => {
        isclick = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        if (e.target.tagName == 'IMG') {
            startDom = e.target.parentElement;
        } else {
            startDom = e.target;
        }
        startDom.style.zIndex = '999';
        startDom.style.opacity = '0.8';
    })

    mediaDom.addEventListener('mousemove', (e) => {
        e.preventDefault()
        if (isclick == false) return;
        const moveX = e.clientX - startX;
        const moveY = e.clientY - startY;
        if (e.target.tagName == 'IMG' && e.target.parentElement.parentElement.classList.contains('file_upload')) {
            startDom.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }
        if (Math.abs(moveX) > 5 || Math.abs(moveY) > 5) {
            isDragging = true;
        }
    })

    mediaDom.addEventListener('mouseup', (e) => {
        startDom.style.visibility = 'hidden';
        const endDom = document.elementFromPoint(e.clientX, e.clientY);
        if (endDom.tagName == 'IMG' && endDom.closest('.file_upload')) {
            const start = startDom;
            const end = endDom.parentElement;
            const container = endDom.closest('.file_upload');
            const startIndex = Array.from(container.children).indexOf(start);
            const endIndex = Array.from(container.children).indexOf(end);


            // 验证目标元素是否在可排序容器中
            let target = null;
            if (endDom && endDom.tagName == 'IMG' && endDom.closest('.file_upload')) {
                target = endDom.parentElement;
            } else if (endDom && endDom.classList.contains('file_upload')) {
                // 如果直接拖到容器上（没有具体元素），不处理
                resetElement();
                return;
            } else if (endDom && endDom.parentElement?.classList.contains('file_upload')) {
                target = endDom;
            }

            // 如果没有有效目标或目标就是起始元素，则复位
            if (!target || target === startDom) {
                resetElement();
                return;
            }

            // 如果索引有效且不同，则交换位置
            if (startIndex !== -1 && endIndex !== -1 && startIndex !== endIndex) {
                // 在DOM中实际交换位置
                if (startIndex < endIndex) {
                    container.insertBefore(startDom, target.nextSibling);
                } else {
                    container.insertBefore(startDom, target);
                }

                // 延迟复位使动画可见
                resetElement();
                return;
            }
        }
        function resetElement() {
            startDom.style.transform = 'translate(0px, 0px)';
            startDom.style.zIndex = '';
            startDom.style.opacity = '';
            startDom.style.visibility = 'visible';
            isclick = false;
        }
        resetElement();

    })

    // 在 click 事件中检查标志
    mediaDom.addEventListener('click', (e) => {
        if (isDragging) {
            e.preventDefault();
            e.stopImmediatePropagation();
            isDragging = false; // 重置标志
        }
    });
}

/**缓存编辑内容 */
function cacheEditor(mode, e) {
    if (mode == 'add') {
        localStorage.setItem('editor', e.innerHTML);
    }
}

function isPlainText(editableDiv) {
    const children = editableDiv.childNodes;

    // 如果只有一个子节点且是文本节点，则是纯文本
    if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
        return true;
    }

    // 否则，检查是否有非空文本节点未被标签包裹
    for (const child of children) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== "") {
            return true; // 存在未包裹的文本
        }
    }

    return false; // 所有文本都被标签包裹
}

function editor_focusin_hidden_menu(content) {
    if (window.innerWidth > 880) return;
    content.addEventListener('focusin', () => {
        let isHidden = false; // 标记 menu 是否已隐藏
        const menu = getDomFromId('menu');
        const editor = getDomFromId('editor_content');

        // 防抖函数，减少滚动事件触发频率
        const debounceScroll = debounce(() => {
            const isOverlapping = ifElementOverlap(menu, editor, 0, 0);

            if (isOverlapping && !isHidden) {
                // 隐藏 menu
                menu.style.opacity = '0';
                setTimeout(() => {
                    menu.style.pointerEvents = 'none';
                }, 300);
                isHidden = true;
            } else if (!isOverlapping && isHidden) {
                // 显示 menu
                menu.style.pointerEvents = 'all';
                menu.style.opacity = '1';
                setTimeout(() => {
                }, 300); // 立即执行，避免不必要的延迟
                isHidden = false;
            }
        }, 5); // 50ms 防抖间隔

        // 添加滚动监听
        document.addEventListener('scroll', debounceScroll);
        document.addEventListener('focusin', debounceScroll);

        // 移除焦点时清理滚动监听（可选）
        content.addEventListener('focusout', () => {
            document.removeEventListener('scroll', debounceScroll);
            document.removeEventListener('focusin', debounceScroll);
        });
    });
}

function PostEditorPanel(mode = 'add') {

    let location_meta = null;
    let weather_meta = null;
    let w_f = false;
    const editHtml = `
        <div id="editor" data-mode="add" class="post editor post_pin_disable" tabindex="0" style="border: 1px dashed #999;">
            <div class="title">
                <h1 id="editor_title" contenteditable="true" style='outline:none;word-break: break-all;' data-placeholder="输入标题"></h1>
            </div>
            <div class="content">
                <span id="editor_tag" class="tag icon-topic" style='float:left;position:relative;z-index:10;' contenteditable="true" data-placeholder="${getDomFromId('menu').dataset.t}"></span>
            </div>
            ${typeof getMarkdownToolbar === 'function' ? '<div class="editor-toolbar-wrapper">' + getMarkdownToolbar() + '</div>' : ''}
            <div id="editor_content" contenteditable="true" style='outline:none;word-break: break-all;' data-placeholder="请输入内容...（支持 Markdown 语法）"></div>
            <div class="annex file_upload">
            </div>
            <div class="meta">
                <span id="editor_weather" class="weather" style="z-index:3;" tabindex="0">
                    <div class='weather_000' data-title='选择天气'></div>
                </span>
                <span id="editor_location" contenteditable="true">
                    正在定位中...
                </span>
                <span>
                    <div id="editor_date" class="date2">${getYMD(new Date())[0]}-${padZero(new Date().getMonth() + 1)}-${getYMD(new Date())[2]}</div>
                    <span id="editor_time" contenteditable="true">${getYMD(new Date())[3] + ":" + getYMD(new Date())[4]}</span>
                    <input id='hidden_meta' type='text' style="opacity:0;width:0;height:0;" disabled>
                </span>
            </div>
        </div>
    `;
    if (mode == 'add') {
        if (window.innerWidth < 801) {
            document.querySelector('main').insertAdjacentHTML('afterbegin', editHtml);
        } else {
            document.querySelector('.FIX').insertAdjacentHTML('afterbegin', editHtml);
        }
        ElementToViewTop(getDomFromId('menu'));
    }
    const uploadSVG = `<svg viewBox="0 0 88 88" fill="none">
        <path d="M24.7203 49.4854C23.218 49.4854 22 48.2674 22 46.765V27.7203C22 26.218 23.218 25 24.7203 25H43.7642C45.2666 25 46.4846 26.218 46.4846 27.7203V40.5077H45.6687L39.6834 34.5223L24.7203 49.4854ZM24.7203 49.4854H33.1M57.0948 45.6764V59.2789C57.0948 60.782 55.8768 62 54.3744 62H39.4114C37.909 62 36.6911 60.782 36.6911 59.2789V45.6764C36.6911 44.174 37.909 42.9561 39.4114 42.9561H54.3744C55.8768 42.9561 57.0948 44.174 57.0948 45.6764ZM57.0948 52.4777L66.6171 45.6764V59.2789L57.0948 52.4777ZM31.5216 32.4815C31.5216 31.3547 30.6083 30.4415 29.4815 30.4415C28.3547 30.4415 27.4407 31.3547 27.4407 32.4815C27.4407 33.6083 28.3547 34.5223 29.4815 34.5223C30.6083 34.5223 31.5216 33.6083 31.5216 32.4815Z" stroke="#B7B7B7" stroke-width="2" stroke-linejoin="round"/>
    </svg>`;
    document.querySelector('#editor .file_upload').insertAdjacentHTML('beforeend', `<div class="img zip_disable lb_disable"><input id='fileUpload' type="file" multiple/ accept="image/*, video/*">${uploadSVG}</div>`)

    document.querySelector('#editor .meta').insertAdjacentHTML('beforeend', `<div id="editorTool"><span class="mybutton dark" id="CancelPost">取消</span><span class="mybutton dark" id="SendPost">${mode == 'add' ? '发布' : '更新'}</span></div>`);

    const editorPanl = getDomFromId('editor');
    if (mode == 'update') {
        get_fetch({
            api: 'get_meta',
            token: localStorage.getItem('token'),
            id: editorPanl.dataset.id
        }, (data => {
            const meta = JSON.parse(data);
            if (meta.code === 10401) {
                updateLoginStatus();
                return;
            }
            weather_meta = meta['weather'];
            location_meta = meta['location'];
        }))
    }

    if (mode == 'add') {
        PostOpen(editorPanl);
        if (localStorage.getItem('editor')) {
            editorPanl.innerHTML = localStorage.getItem('editor');
            try {
                Array.from(getDomFromId('editor').querySelector('.annex').children).slice(0, -1).forEach(item => {
                    item.getElementsByClassName('icon-trash')[0].onclick = () => {
                        ElementFade(item, false, true);
                        item.style.transition = "all .2s";
                    }
                    item.setAttribute('draggable', false);
                    item.querySelector('img').setAttribute('draggable', false);
                    dragImage(item);
                });
            } catch (e) {
                localStorage.removeItem('editor')
                showBubble('缓存出错，请手动保存', 'error', 3000)
            }
            setTimeout(() => {
                getDomFromId('CancelPost').innerHTML = "丢弃";
            }, 100);
        }
    }

    const weatherIcon = ['000', '01d', '01n', '02d', '02n', '03d', '03n', '04d', '04n', '09d', '09n', '10d', '10n', '11d', '11n', '13d', '13n', '50d', '50n']
    const weather_select = createElement({
        type: 'div',
        attributes: {
            id: 'weatherSelect',
            className: 'hidden'
        }
    })
    weatherIcon.forEach(icon => {
        weather_select.appendChild(createElement({ type: 'div', attributes: { className: `weather_${icon}`, title: weatherMap[icon], alt: icon } }))
    })
    document.querySelector('#editor .meta').insertAdjacentElement('afterend', weather_select);

    editorPanl.onclick = (e) => {
        if (e.target.id !== 'editor') {
            return;
        }
        const rect = editorPanl.getBoundingClientRect();
        const width = rect.width; // div 的实际宽度
        if (e.offsetX <= 40 && e.offsetY <= 40) {
            classNameSwitch(editorPanl, 'post_pin', 'post_pin_disable');
        } else if (e.offsetX >= width - 40 && e.offsetY <= 40) {
            classNameSwitch(editorPanl, 'post_hidden', 'post_hidden_disable');
        }
    }
    const sendpost = getDomFromId('SendPost');
    const cancelpost = getDomFromId('CancelPost');

    const weather = getDomFromId('editor_weather');

    weather_select.onclick = (e) => {
        if (!e.target.className.includes('weather_')) return;
        const icon = e.target.className.replace('weather_', '');
        weather.children[0].className = `weather_${icon}`;
        weather.children[0].dataset.title = weatherMap[icon];
        w_f = true;
        weather.click();
        weather_meta = icon;

        cacheEditor(mode, editorPanl);
        localStorage.setItem('weather', JSON.stringify(weather_meta))
    }
    cancelpost.onclick = () => {
        if (mode == 'add') {
            editorPanl.style.maxHeight = editorPanl.clientHeight + "px";
            editorTool.remove();
            PostClose(editorPanl);
            if (localStorage.getItem('editor')) {
                localStorage.removeItem('editor');
                localStorage.removeItem('weather');
                localStorage.removeItem('location');
            }
            toWindowTop();
        } else {
            if (localStorage.getItem('editor')) {
                localStorage.removeItem('editor');
                localStorage.removeItem('weather');
                localStorage.removeItem('location');
            }
            ElementFade(document.getElementsByClassName('lb_disable')[0], false, true)
            ElementFade(getDomFromId('editorTool'), false, true)
            setTimeout(() => {
                editorPanl.replaceWith(domBackup);
                domBackup.querySelector('.content').style.maxHeight = '38rem';
                if (domBackup.offsetHeight > 38 * fontsize) {
                    ElementToViewTop(domBackup);
                }
                foldPost(domBackup.querySelector('.content'));
                if (typeof applySmartImageLayout === 'function') {
                    applySmartImageLayout(domBackup);
                }
            }, 300);
        }
    }
    sendpost.onclick = async () => {
        ElementDisable(sendpost, true);
        const media = document.querySelector('.file_upload');

        Array.from(media.children).forEach((item, key) => {
            if (key < 8) { return }
            if (key == 8) {
                item.classList.add('more');
                item.appendChild(createElement({ type: 'span' }))
                item.querySelector('span').innerHTML = `剩余${media.children.length - 10}张`;
            }
            if (key < 9) { return }
            item.classList.add('annexh');
        })

        const mediaLen = media.childElementCount - 1;
        let files = [];
        for (let i = 0; i < mediaLen; i++) {
            const dom = media.children[i];
            const imgEl = dom.children[0];
            const cnbUrl = imgEl.dataset.cnbUrl;
            if (cnbUrl) {
                files.push([cnbUrl, imgEl.dataset.sourceName || '', imgEl.getAttribute('data-info').replace(/&quot;/g, '"')]);
            } else {
                const _temp = imgEl.dataset.url.match(/^(?:(.*)\/)?([^\/]+?)\.([^.\/]+)$/);
                files.push([_temp[1], _temp[2], _temp[3], imgEl.getAttribute('data-info').replace(/&quot;/g, '"')]);
                if (dom.classList.contains('video')) {
                    files[i].push(imgEl.src);
                }
            }
        }
        const date = getDomFromId('editor_date').textContent + ' ' + getDomFromId('editor_time').textContent;
        let E_title = getDomFromId('editor_title').textContent;
        
        // 智能获取编辑器内容：检测是否为 Markdown 格式
        const rawHtml = getDomFromId('editor_content').innerHTML;
        const rawText = getDomFromId('editor_content').textContent;
        
        let E_content;
        if (typeof isMarkdownContent === 'function' && isMarkdownContent(rawText)) {
            // Markdown 内容：保留原始文本，不进行 sanitize 处理
            console.log('[Editor] 检测到 Markdown 内容，保留原始格式');
            E_content = rawText.trim();
        } else {
            // 普通 HTML 内容：进行安全处理
            E_content = removeAllAttributes(sanitizeContent(rawHtml, true)).trim();
        }
        
        if (getDomFromId('editor_title').textContent == "输入标题") {
            E_title = '';
            getDomFromId('editor_title').innerHTML = '';
        }
        if (E_content == "请输入内容...") {
            E_content = '';
            getDomFromId('editor_content').innerHTML = '';
        }
        const _hidden = editorPanl.classList.contains('post_hidden');

        if (_hidden) {
            E_title = await EncryptText(E_title);
            E_content = await EncryptText(E_content);
        }

        postDate = {
            "mode": editorPanl.dataset.mode,
            "top": editorPanl.classList.contains('post_pin') ? 1 : 0,
            "hidden": _hidden ? 1 : 0,
            "title": E_title,
            "tag": getDomFromId('editor_tag').textContent,
            "content": E_content,
            "media": files,
            "weather": weather_meta ? weather_meta : weather.children[0].className.replace('weather_', ''),
            "location": location_meta,
            "date": date,
            "id": editorPanl.dataset.id,
            "archive": 0
        };

        sendpost.classList.add('sending');

        if (mode == 'add') {
            get_fetch({
                api: 'new_post',
                token: localStorage.getItem('token'),
                data: JSON.stringify(postDate)
            }, (response) => {
                const Data = JSON.parse(response);
                if (Data.code === 10401) {
                    updateLoginStatus();
                    return;
                }
                if (Data['code'] == 10200) {
                    if (isDate(date) > 0) {
                        showBubble("定时文章已发送", 'success', 3000);
                    } else {
                        showBubble("文章提交成功", 'info', 3000);
                    }
                    localStorage.removeItem('editor');
                    localStorage.removeItem('weather');
                    localStorage.removeItem('location');

                    if (Data['dir'] !== '') {
                        const _media = document.querySelector('.file_upload');
                        for (i = 0; i < _media.childElementCount - 1; i++) {
                            const dom = _media.children[i].firstChild;
                            dom.dataset.url = dom.dataset.url.replace(/\/temp/g, Data['dir']);
                            dom.src = dom.src.replace(/\/temp/g, '/' + Data['dir']);
                        }
                    }

                    const dom = getDomFromId('editor');
                    dom.dataset.id = Data['id'];
                    const con = dom.querySelector('.content');
                    con.style.maxHeight = con.scrollHeight + 'px';
                    const media = dom.querySelector('.annex');
                    media.querySelectorAll('.icon-trash').forEach((e) => {
                        e.remove();
                    })
                    if (con.offsetHeight > 38 * fontsize) {
                        setTimeout(() => {
                            foldPost(con);
                            dom.querySelector('.lb_disable').remove();
                            media.classList.remove('file_upload');
                            ElementToViewTop(dom, 5);
                        }, 500);
                    } else {
                        dom.querySelector('.lb_disable').remove();
                        media.classList.remove('file_upload');
                    }

                    setTimeout(() => {
                        dom.classList.remove('post_pin_disable');
                        dom.classList.remove('post_hidden_disable');
                        dom.classList.remove('editor');
                        dom.style.border = 'none';
                        dom.id = '';
                        const title = dom.querySelector('.title h1');
                        title.id = '';
                        title.removeAttribute('contenteditable');
                        title.innerHTML += '<span class="Revise"></span>';
                        const tag = dom.querySelector('.tag');
                        tag.innerText = tag.innerText == '' ? getDomFromId('menu').dataset.t : tag.innerText.trim();
                        tag.id = '';
                        tag.removeAttribute('contenteditable');
                        const _tag = tag.cloneNode(true);
                        const content = dom.querySelector('.content');
                        if (_hidden) {
                            content.innerHTML = content.querySelector('#editor_content').innerHTML;
                        } else {
                            content.innerHTML = E_content;
                        }
                        content.insertAdjacentElement('afterbegin', _tag);
                        _tag.style.color = '';
                        _tag.style.backgroundColor = '';
                        content.id = '';
                        content.removeAttribute('contenteditable');
                        const metas = dom.querySelector('.meta');
                        const meta = metas.children;
                        metas.querySelector('#hidden_meta').remove();
                        _hidden ? '' : metas.insertAdjacentHTML('beforeend', '<span onclick="share(' + dom.dataset.id + ',this)" class="icon-share"></span>')
                        meta[0].id = '';
                        meta[0].parentNode.replaceChild(meta[0].cloneNode(true), meta[0]);
                        meta[1].id = '';
                        meta[1].removeAttribute('contenteditable');
                        meta[1].innerText == '输入地址' ? meta[1].innerText = '' : '';
                        meta[0].children[0].className == 'weather_000' ? meta[0].children[0].style.display = 'none' : '';
                        const time = meta[2].children;
                        time[0].id = '';
                        time[1].id = '';
                        time[1].removeAttribute('contenteditable');
                        dom.querySelector('#editorTool').remove();
                        media.parentNode.replaceChild(media.cloneNode(true), media);
                        dom.querySelector('#weatherSelect').remove();
                        
                        // 移除编辑器相关的残留元素（重要！这些元素在 .content 外部）
                        const editorContent = dom.querySelector('#editor_content');
                        if (editorContent) {
                            editorContent.remove();
                            console.log('[Editor] 已移除 #editor_content 残留');
                        }
                        
                        const toolbarWrapper = dom.querySelector('.editor-toolbar-wrapper') || dom.parentElement.querySelector('.editor-toolbar-wrapper');
                        if (toolbarWrapper) {
                            toolbarWrapper.remove();
                            console.log('[Editor] 已移除 Markdown 工具栏');
                        }
                        
                        // 移除编辑器附件区域（如果存在且为空）
                        const annexUpload = dom.querySelector('.annex.file_upload');
                        if (annexUpload && annexUpload.children.length === 0) {
                            annexUpload.remove();
                        }
                        
                        // 新增：渲染 Markdown 内容
                        setTimeout(() => {
                            const contentDiv = dom.querySelector('.content');
                            if (contentDiv && typeof isMarkdownContent === 'function' && typeof renderMarkdown === 'function') {
                                const text = contentDiv.textContent || '';
                                const tagSpan = contentDiv.querySelector('.tag');
                                let cleanText = text;
                                
                                if (tagSpan) {
                                    cleanText = text.replace(tagSpan.textContent, '').trim();
                                }
                                
                                if (isMarkdownContent(cleanText)) {
                                    console.log('[Editor] 发布后渲染 Markdown 内容');
                                    
                                    try {
                                        let mdHtml = renderMarkdown(cleanText);
                                        if (!mdHtml.includes('class="markdown-body"')) {
                                            mdHtml = '<div class="markdown-body">' + mdHtml + '</div>';
                                        }
                                        
                                        // 保留标签
                                        contentDiv.innerHTML = '';
                                        if (tagSpan) {
                                            contentDiv.appendChild(tagSpan.cloneNode(true));
                                        }
                                        
                                        // 插入渲染内容
                                        contentDiv.insertAdjacentHTML('beforeend', mdHtml);
                                        
                                        setTimeout(() => {
                                            if (typeof applySmartImageLayout === 'function') {
                                                applySmartImageLayout(dom);
                                            }
                                            if (typeof foldPost === 'function') {
                                                contentDiv.style.maxHeight = '';
                                                foldPost(contentDiv);
                                            }
                                        }, 100);
                                        
                                    } catch (e) {
                                        console.error('[Editor] Markdown 渲染错误:', e);
                                    }
                                }
                            }
                        }, 150);
                    }, 100);
                    get_tags();
                    get_yearmonth();
                } else {
                    ElementDisable(sendpost, false);
                    showBubble(`后台错误：${Data['code']}`, 'error', 3000);
                }
                sendpost.classList.remove('sending');
            })
        } else {
            get_fetch({
                api: 'update_post',
                token: localStorage.getItem('token'),
                data: JSON.stringify(postDate)
            }, (response) => {
                const Data = JSON.parse(response);
                if (Data.code === 10401) {
                    updateLoginStatus();
                    return;
                }
                if (Data['code'] == 10200) {
                    showBubble("已更新文章", 'info', 3000);
                    localStorage.removeItem('editor');
                    localStorage.removeItem('weather');
                    localStorage.removeItem('location');

                    if (Data['dir'] !== '') {
                        const _media = document.querySelector('.file_upload');
                        for (i = 0; i < _media.childElementCount - 1; i++) {
                            const dom = _media.children[i].firstChild;
                            dom.dataset.url = dom.dataset.url.replace(/\/temp/g, Data['dir']);
                            dom.src = dom.src.replace(/\/temp/g, '/' + Data['dir']);
                        }
                    }
                    const dom = getDomFromId('editor');
                    const con = dom.querySelector('.content');
                    con.style.maxHeight = con.scrollHeight + 'px';
                    const media = dom.querySelector('.annex');
                    media.querySelectorAll('.icon-trash').forEach((e) => {
                        e.remove();
                    })
                    if (con.offsetHeight > 38 * fontsize) {
                        setTimeout(() => {
                            foldPost(con);
                            dom.querySelector('.lb_disable').remove();
                            media.classList.remove('file_upload');
                            ElementToViewTop(dom, 5);
                        }, 500);
                    } else {
                        dom.querySelector('.lb_disable').remove();
                        media.classList.remove('file_upload');
                    }

                    setTimeout(() => {
                        dom.classList.remove('post_pin_disable');
                        dom.classList.remove('post_hidden_disable');
                        dom.classList.remove('editor');
                        dom.id = '';
                        const title = dom.querySelector('.title h1');
                        title.id = '';
                        title.removeAttribute('contenteditable');
                        title.innerHTML += '<span class="Revise"></span>';
                        const tag = dom.querySelector('.tag');
                        tag.id = '';
                        tag.removeAttribute('contenteditable');
                        const _tag = tag.cloneNode(true);
                        const content = dom.querySelector('.content');
                        if (_hidden) {
                            content.innerHTML = content.querySelector('#editor_content').innerHTML;
                        } else {
                            content.innerHTML = E_content;
                        }
                        content.insertAdjacentElement('afterbegin', _tag);
                        _tag.style.color = '';
                        _tag.style.backgroundColor = '';
                        content.id = '';
                        content.removeAttribute('contenteditable');
                        const metas = dom.querySelector('.meta');
                        const meta = metas.children;
                        metas.querySelector('#hidden_meta').remove();
                        _hidden ? '' : metas.insertAdjacentHTML('beforeend', '<span onclick="share(' + dom.dataset.id + ',this)" class="icon-share"></span>')
                        meta[0].id = '';
                        meta[0].parentNode.replaceChild(meta[0].cloneNode(true), meta[0]);
                        meta[1].id = '';
                        meta[1].removeAttribute('contenteditable');
                        meta[1].innerText == '输入地址' ? meta[1].innerText = '' : '';
                        meta[0].children[0].className == 'weather_000' ? meta[0].children[0].style.display = 'none' : '';
                        const time = meta[2].children;
                        time[0].id = '';
                        time[1].id = '';
                        time[1].removeAttribute('contenteditable');
                        dom.querySelector('#editorTool').remove();
                        media.parentNode.replaceChild(media.cloneNode(true), media);
                        dom.querySelector('#weatherSelect').remove();
                        
                        // 移除编辑器相关的残留元素（更新模式）
                        const editorContentUpdate = dom.querySelector('#editor_content');
                        if (editorContentUpdate) {
                            editorContentUpdate.remove();
                            console.log('[Editor] 更新模式：已移除 #editor_content 残留');
                        }
                        
                        const toolbarWrapperUpdate = dom.querySelector('.editor-toolbar-wrapper') || dom.parentElement.querySelector('.editor-toolbar-wrapper');
                        if (toolbarWrapperUpdate) {
                            toolbarWrapperUpdate.remove();
                            console.log('[Editor] 更新模式：已移除 Markdown 工具栏');
                        }
                        
                        // 新增：渲染 Markdown 内容
                        setTimeout(() => {
                            const contentDivUpdate = dom.querySelector('.content');
                            if (contentDivUpdate && typeof isMarkdownContent === 'function' && typeof renderMarkdown === 'function') {
                                const textUpdate = contentDivUpdate.textContent || '';
                                const tagSpanUpdate = contentDivUpdate.querySelector('.tag');
                                let cleanTextUpdate = textUpdate;
                                
                                if (tagSpanUpdate) {
                                    cleanTextUpdate = textUpdate.replace(tagSpanUpdate.textContent, '').trim();
                                }
                                
                                if (isMarkdownContent(cleanTextUpdate)) {
                                    console.log('[Editor] 更新后渲染 Markdown 内容');
                                    
                                    try {
                                        let mdHtmlUpdate = renderMarkdown(cleanTextUpdate);
                                        if (!mdHtmlUpdate.includes('class="markdown-body"')) {
                                            mdHtmlUpdate = '<div class="markdown-body">' + mdHtmlUpdate + '</div>';
                                        }
                                        
                                        contentDivUpdate.innerHTML = '';
                                        if (tagSpanUpdate) {
                                            contentDivUpdate.appendChild(tagSpanUpdate.cloneNode(true));
                                        }
                                        
                                        contentDivUpdate.insertAdjacentHTML('beforeend', mdHtmlUpdate);
                                        
                                        setTimeout(() => {
                                            if (typeof applySmartImageLayout === 'function') {
                                                applySmartImageLayout(dom);
                                            }
                                            if (typeof foldPost === 'function') {
                                                contentDivUpdate.style.maxHeight = '';
                                                foldPost(contentDivUpdate);
                                            }
                                        }, 100);
                                        
                                    } catch (e) {
                                        console.error('[Editor] 更新模式 Markdown 渲染错误:', e);
                                    }
                                }
                            }
                        }, 150);
                    }, 100);
                    get_tags();
                    get_yearmonth();
                } else {
                    ElementDisable(sendpost, false);
                    showBubble(`后台错误：${Data['code']}`, 'error', 3000);
                }
                sendpost.classList.remove('sending');
            })
        }
    }
    
    // 初始化 Markdown 工具栏
    if (typeof initMarkdownToolbar === 'function') {
        setTimeout(() => {
            initMarkdownToolbar();
            console.log('Markdown 工具栏已初始化');
        }, 100);
    }

    const title = getDomFromId('editor_title');
    _addEvent(title);
    const tag = getDomFromId('editor_tag');
    _addEvent(tag);
    const centent = getDomFromId('editor_content');
    _addEvent(centent);

    centent.addEventListener('focusin', () => {
        setupEditableDiv(centent);
    }, { once: true });

    editor_focusin_hidden_menu(centent);

    //视图跟随光标修复
    const height_ = centent.clientHeight
    let height = height_;
    centent.addEventListener('keydown', () => {
        setTimeout(() => {
            const cen = getDomFromId('editor_content');
            const offset = cen.clientHeight - height;
            if (height !== cen.clientHeight && Math.abs(offset) < fontsize * 4) {
                // 平滑相对滚动
                window.scrollBy({
                    top: offset,
                    left: 0,
                    behavior: "smooth"
                });
                height = cen.clientHeight;
            }
        }, 0);
    })

    centent.style.textIndent = tag.clientWidth / 12 + 0.8 + "rem";
    editor_content_replace();
    const location = getDomFromId('editor_location');
    const datetime = getDomFromId('editor_time');
    disableEnterKey(location, () => { location.blur() });
    disableEnterKey(datetime, () => { datetime.blur() });
    const datedate = getDomFromId('editor_date');
    const editorTool = getDomFromId('editorTool');
    let currdate = getYMD(new Date())[3] + ":" + getYMD(new Date())[4];
    let interval = setInterval(() => {
        if (document.activeElement !== datetime) {
            currdate = datetime.textContent = getYMD(new Date())[3] + ":" + getYMD(new Date())[4];
        }
    }, 60000);
    let temp_date = [datedate.innerText, datetime.innerText];
    datetime.onfocus = () => {
        datetime.dataset.time = datetime.innerText;
        datetime.textContent = datedate.innerText + ' ' + datetime.innerText;
        datetime.style.padding = '.2rem .4rem';
        classNameSwitch(editorTool, 'hidden', 'display');
        classNameSwitch(datedate, 'hidden', 'display');
    }
    datetime.onblur = () => {
        editorTool.classList.remove('hidden'); datedate
        datedate.classList.remove('hidden'); datedate
        datetime.style.padding = '';
        const _isDate = isDate(datetime.innerText);
        if (!_isDate) {
            showBubble("日期不合法，请重新输入", 'warning', 5000);
            datetime.textContent = currdate;
            return;
        }
        const _date = getYMD(datetime.innerText);
        const date = _date[0] + '-' + _date[1] + '-' + _date[2];
        const time = _date[3] + ':' + _date[4]
        if (date + ' ' + time !== datedate.innerText + ' ' + datetime.dataset.time) {
            clearInterval(interval);
        }
        datetime.textContent = time;
        datedate.innerText = date;
        if (_isDate > 0) {
            if (mode == 'add') {
                showBubble(`将在 ${date} ${time}后发送`, 'success', 3000);
                datetime.classList.add('icon-time');
                datetime.style.color = '#8BC34A';
            } else {
                showBubble(`时间不合法`, 'error', 5000);
                datedate.innerText = temp_date[0];
                datetime.textContent = temp_date[1];
            }
        } else {
            datetime.classList.remove('icon-time');
            datetime.style.color = '';
        }
        cacheEditor(mode, editorPanl);
    }

    //location weather
    if (mode == 'add') {
        get_fetch({
            api: 'get_location',
            token: localStorage.getItem('token')
        }, (data) => {
            const Data = JSON.parse(data);
            if (Data.code === 10401) {
                updateLoginStatus();
                return;
            }
            if (Data.code === 10001) {
                location.textContent = "输入地址"
                return;
            }
            if (Data['code'] == 10200) {
                const map = new Map([[1, 'province'], [2, 'city'], [3, 'district']])
                const mode = Data['mode'].toString().split('').map(Number);
                let temp = '';
                mode.forEach(i => {
                    temp += Data[map.get(i)] + ' ';
                });
                location.textContent = temp;
                location_meta = Data;
            } else if (Data['code'] == '00001') {
                location.textContent = '默认地址';
                location_meta = Data;
            } else {
                location.textContent = '默认地址';
                location_meta = Data;
                console.log('获取失败使用默认地址:' + Data['code']);
            }
            get_fetch({
                api: 'get_weather',
                token: localStorage.getItem('token'),
                location: JSON.stringify([location_meta.latitude, location_meta.longitude])
            }, (data1) => {
                const Data = JSON.parse(data1);
                if (Data.code === 10401) {
                    updateLoginStatus();
                    return;
                }
                if (Data.code == 10200) {
                    if (document.activeElement !== weather && !w_f) {
                        weather_meta = Data;
                        weather.children[0].className = `weather_${Data.icon}`;
                        weather.children[0].dataset.title = weatherMap[Data.icon];
                    }
                } else {
                    weather_meta = '000';
                }
            })

        });
    } else {
        if (location.innerText.trim() == '') {
            location.textContent = "输入地址"
        }
    }

    weather.onclick = () => {
        let weatherselect = getDomFromId('weatherSelect');
        classNameSwitch(weatherselect, 'hidden', 'display')
        weatherselect.classList.contains('hidden') ? editorTool.classList.remove('hidden') : editorTool.classList.add('hidden');
    }
    location.onfocus = () => {
        handlePaste(location);
        location.dataset.value = location.textContent;
        if (location_meta['province'] && location_meta['city'] && location_meta['district']) {
            location.textContent = `${location_meta['province']},${location_meta['city']},${location_meta['district']}`;
        }
        location.style.padding = '.2rem .4rem';
        classNameSwitch(editorTool, 'hidden', 'display');
        setTimeout(() => {
            moveCursorToEnd(location)
        }, 1);
    }
    location.oninput = () => {
        LimitEditableLength(location, 30);
    }
    location.onblur = () => {
        editorTool.classList.remove('hidden');
        location.style.padding = '';
        let content = location.textContent;
        if (content.split(',').length === 3) {
            content = content.split(',');
        } else if (content.split('，').length === 3) {
            content = content.split('，');
        } else {
            content = content.split(' ');
        }



        if (content.length < 3 || (content[0] == '' || content[1] == '' || content[2] == '')) {
            showBubble('请按省 市 区格式填写！', 'warning', 5000, true);
            location.textContent = location.dataset.value;
            return;
        }
        location_meta['code'] = 200
        location_meta['province'] = content[0];
        location_meta['city'] = content[1];
        location_meta['district'] = content[2];
        location_meta['latitude'] = null;
        location_meta['longitude'] = null;
        const map = new Map([[1, 'province'], [2, 'city'], [3, 'district']])
        const _mode = location_meta['mode'].toString().split('').map(Number);
        let temp = '';
        _mode.forEach(i => {
            temp += location_meta[map.get(i)] + ' ';
        });
        location.textContent = temp;
        cacheEditor(mode, editorPanl);
        localStorage.setItem('location', JSON.stringify(location_meta))
    }

    let isComposing = false;
    let fillcount = tag.innerText.length;
    let debounceTimer;

    tag.addEventListener('compositionupdate', () => {
        isComposing = true;
        LimitEditableLength(tag, 16);
        centent.style.textIndent = tag.clientWidth / 12 + 0.8 + "rem";
    })
    tag.addEventListener('compositionend', () => {
        isComposing = false;
        LimitEditableLength(tag, 16);
        centent.style.textIndent = tag.clientWidth / 12 + 0.8 + "rem";
        tagInput();
    })

    tag.oninput = () => {
        tagInput();
    }
    _next(title, tag);
    _next(tag, centent);

    tag.onblur = (e) => {
        centent.style.textIndent = tag.clientWidth / 12 + 0.8 + "rem";
        if (e.target.textContent == '') {
            centent.style.textIndent = 6 + "rem";
            tag.style.color = '';
            tag.style.backgroundColor = '';
        } else {
            if (rgbToHex(tag.style.color) !== '#45b17b') {
                tag.style.color = '';
                tag.style.backgroundColor = '';
            }
        }
    }
    const mediafile = getDomFromId('fileUpload');
    if (getDomFromId('menu').dataset.z == '1') {
        classNameSwitch(mediafile.parentElement, 'zip_disable', 'zip');
    }

    const mediaUp = getDomFromId('editor');
    // 阻止默认拖放行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        mediaUp.addEventListener(eventName, preventDefaults, false);
    });

    // 高亮显示拖拽区域
    ['dragenter', 'dragover'].forEach(eventName => {
        mediaUp.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        mediaUp.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        mediaUp.classList.add('highlight');
    }

    function unhighlight() {
        mediaUp.classList.remove('highlight');
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // 处理拖放的文件
    mediaUp.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        uploadFile(files);

    }, false);
    // 处理点击选择的文件
    mediafile.addEventListener('change', function () {
        uploadFile(mediafile.files);
    });

    async function uploadFile(files) {
        const mediafileList = files;
        if (mediafileList.length === 0) {
            return;
        }
        // 存储所有活动的XMLHttpRequest对象
        const activeUploads = new Map();

        for (const file of Array.from(mediafileList)) {
            await PicprocessItem(file);
        }

        async function PicprocessItem(file) {
            if (getSupportFormat(file.type) === 'unknown') {
                showBubble('格式不支持', 'info')
                return;
            };
            const classList = mediafile.parentElement.classList;
            let zip = 0;
            if (classList.contains('zip')) {
                zip = 1;
            }
            const xhr = uploadFile(file, zip);
            //储存xhr对象，用于取消上传
            activeUploads.set(file.name, xhr);
            xhr.timeout = 60000; // 5秒后超时
        };
        //创建上传dom。
        async function uploadFile(file, zip) {

            let thumbnail = false;
            if (document.getElementsByClassName('lb_disable')[0].classList.contains('encryption')) {
                let type = await getFileCategory(file);
                if (!(type == 'jpg' || type == 'gif')) {
                    showBubble('暂不支持图片以外类型加密', 'warning', 3000)
                    return;
                };
                //图片加密
                try {
                    const thumb = new FormData();
                    let link = 'kernel/asset/img/encryption.png';
                    if (getDomFromId('menu').dataset.c == 1) {
                        link = await get_img('kernel/asset/img/encryption.png');
                    }
                    let thum_bur_file = await processImageWithWatermark(file, 0.1, link);
                    let thum_orign_file = await cropImageToSquare(file);
                    const enc_t = await encryptImage(thum_orign_file, localStorage.getItem('key'), thum_bur_file, 0.3);
                    const thum_enc_file = base64ToFile(enc_t, file.name.replace(/\.[^/.]+$/, ".png"))
                    thumb.append('file', thum_enc_file);

                    thumb.append('api', 'upload_media');
                    thumb.append('token', localStorage.getItem('token'));
                    thumb.append('zip', 9);
                    const encrypted = await encryptImage(file, localStorage.getItem('key'), link);
                    file = base64ToFile(encrypted, file.name.replace(/\.[^/.]+$/, ".png"));
                    thumbnail = await fetch('/kernel/api.php', {
                        method: 'POST',
                        body: thumb
                    })
                        .then(response => response.text())
                        .then(data => { return data });
                } catch (error) {
                    alert('警告：\n' + error);
                    console.error(error);
                    return;
                }
            }

            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            // 添加文件到FormData
            formData.append('file', file);
            // 添加其他参数到FormData
            formData.append('api', 'upload_media');
            formData.append('token', localStorage.getItem('token'));

            if (thumbnail) {
                formData.append('zip', 8);
                formData.append('t_name', thumbnail);
            } else {
                formData.append('zip', zip);
            }

            const trash = createElement({
                type: 'div',
                attributes: {
                    className: 'icon-trash'
                }
            })
            trash.addEventListener('click', () => {
                if (!confirm('是否删除媒体？')) {
                    return;
                }
                mediaDom.style.transition = "all .2s";
                ElementFade(mediaDom, false, true);
            })
            const progress = createElement({
                type: 'div',
                attributes: {
                    className: 'progress',
                    innerText: '取消上传'
                }
            })
            const progressbar = createElement({
                type: 'div',
                attributes: {
                    className: 'progressbar'
                }
            })
            progress.dataset.filename = file.name;

            const mediaDom = createElement({
                type: 'div',
                attributes: {
                    className: 'lb_disable',
                    draggable: false
                },
                children: [progress, progressbar]
            })
            const img = createElement({
                type: 'img',
                attributes: {
                    loading: 'lazy',
                    alt: file.name,
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    draggable: false
                }
            })
            getFileCategory(file).then(type => {
                if (type == 'video') {
                    videoToThumbnailBase64(file).then(base64 => {
                        img.src = base64;
                        mediaDom.insertAdjacentElement('afterbegin', img);
                    })
                } else {
                    fileToBase64(file).then(base64 => {
                        img.src = base64;
                        mediaDom.insertAdjacentElement('afterbegin', img);
                    })
                }
            })
            getFileCategory(file).then(type => {
                mediaDom.classList.add(type);
            })
            getDomFromId('fileUpload').parentElement.insertAdjacentElement('beforebegin', mediaDom);
            progress.addEventListener('click', function () {
                const filename = this.dataset.filename;
                if (activeUploads.has(filename)) {
                    activeUploads.get(filename).abort();
                    activeUploads.delete(filename);
                    progress.textContent = '已取消';
                    setTimeout(() => {
                        mediaDom.remove();
                    }, 1000);
                }
            });
            xhr.upload.addEventListener('progress', function (e) {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 90);
                    progressbar.style.width = percent + '%';
                    progress.title = percent + '%';
                    if (percent == 90) {
                        progress.textContent = '转换中...';
                        progress.disabled = true;
                        progress.style.pointerEvents = 'none';
                    }
                }
            });
            xhr.addEventListener('load', async function () {
                // 上传完成后从Map中移除
                activeUploads.delete(file.name);
                if (xhr.status === 200) {
                    if (!isJSON(xhr.responseText)) {
                        progress.innerText = '回调有误';
                        progress.style.color = 'red';
                        mediaDom.appendChild(trash);
                        img.src = '/kernel/asset/img/default-image.webp';
                        console.error(`文件 ${file.name} 上传失败`, xhr.responseText);
                        progressbar.remove();
                        return;
                    };
                    const Data = JSON.parse(xhr.responseText);
                    if (Data.code === 10401) {
                        updateLoginStatus();
                        return;
                    }
                    if (Data.code == 10400) {
                        mediaDom.remove();
                        showBubble('不支持的格式', 'error');
                        return;
                    };
                    progress.disabled = true;
                    progress.style.pointerEvents = 'none';
                    mediaDom.classList.remove('lb_disable')
                    progress.remove();
                    progressbar.remove();
                    mediaDom.appendChild(trash)
                    //接收到服务器返回的数据时宽度100%
                    progressbar.style.width = '100%';
                    if (Data.url) {
                        img.src = Data.url;
                        img.dataset.url = Data.url;
                        img.dataset.cnbUrl = Data.url;
                        img.dataset.sourceName = Data.sourceName || Data.name || '';
                        const editorContent = getDomFromId('editor_content');
                        if (editorContent) {
                            const altText = Data.sourceName || Data.name || '';
                            const mdImage = `\n![${altText}](${Data.url})\n`;
                            editorContent.focus();
                            document.execCommand('insertText', false, mdImage);
                        }
                    } else {
                        if (getSupportFormat(Data.ext) !== "video") {
                            img.src = "/uploads/temp/thum-" + (thumbnail ? thumbnail : Data.name) + (thumbnail ? '.png' : '.webp');
                            if (thumbnail) {
                                try {
                                    let link = img.src;
                                    if (getDomFromId('menu').dataset.c == 1) {
                                        link = await get_img(img.src);
                                    }
                                    const imgSrc = await urlToBase64(link);
                                    const decrypted = await decryptImage(imgSrc, localStorage.getItem('key'));
                                    img.src = decrypted;
                                    mediaDom.classList = 'enc';
                                } catch (error) {
                                    console.error(error);
                                }
                            }
                        }
                        img.dataset.url = "/temp/" + Data.name + '.' + Data.ext;
                    }
                    (Data.name + Data.ext).includes('GIFwebp') ? mediaDom.className = 'gif' : '';
                    const info = Data.info;
                    let mediaInfo = [];
                    mediaInfo.push(['name', img.title]);
                    mediaInfo.push(['type', Data.ext]);
                    info.resolution === undefined ? '' : mediaInfo.push(['reso', info.resolution]);
                    mediaInfo.push(['size', Data.zip_size]);
                    info.bit_depth === undefined ? '' : mediaInfo.push(['dept', info.bit_depth]);
                    if (Data.info.exif && typeof Data.info.exif !== 'string') {
                        const map = { 'DateTimeOriginal': 'shot', 'ExposureTime': 'expo', 'FNumber': 'fnum', 'ISOSpeedRatings': 'isos', 'FocalLength': 'flen', 'Model': 'mode', 'Software': 'soft', 'ImageDescription': 'desc' };
                        const exif = Data.info.exif;
                        Object.keys(exif).forEach(key => {
                            let value = exif[key];
                            if (key === 'FNumber') {
                                try {
                                    const [a, b] = value.split('/').map(Number);
                                    value = "f/" + (a / b);
                                } catch (e) { }
                            }
                            mediaInfo.push([map[key], value]);
                        })
                    }
                    mediaInfo.push(['zipm', Data.zip]);
                    mediaInfo.push(['zips', info.size]);

                    img.dataset.info = JSON.stringify(mediaInfo);
                    dragImage(mediaDom);
                    cacheEditor(mode, editorPanl);
                } else {
                    progress.innerText = '上传失败';
                    progress.style.color = 'red';
                    mediaDom.appendChild(trash)
                    console.error(`文件 ${file.name} 上传失败`, xhr.responseText);
                }
            });

            xhr.addEventListener('error', function () {
                activeUploads.delete(file.name);
                progress.innerText = '上传出错';
                progress.style.color = 'red';
                mediaDom.appendChild(trash)
                console.error(`文件 ${file.name} 上传出错`);
            });

            xhr.addEventListener('abort', function () {
                activeUploads.delete(file.name);
                progress.innerText = '上传已取消';
                progress.style.color = 'orange';
                console.log(`文件 ${file.name} 上传已取消`);
            });

            xhr.addEventListener('timeout', function () {
                activeUploads.delete(file.name);
                progress.innerText = '上传超时';
                progress.style.color = 'red';
                console.error(`文件 ${file.name} 上传超时`);
                mediaDom.appendChild(trash)
                progressbar.remove();
            });

            xhr.open('POST', '/kernel/api.php', true);
            xhr.send(formData);
            return xhr;
        }
    }

    mediafile.onclick = (e) => {
        if (e.offsetX <= 30 && e.offsetY <= 24) {
            e.preventDefault();
            if (getDomFromId('menu').dataset.e == 1) {
                classNameSwitch(mediafile.parentElement, 'zip_disable', 'zip', 'encryption');
            } else {
                classNameSwitch(mediafile.parentElement, 'zip_disable', 'zip');
            }
        } else {
            mediafile.value = '';
        }
    }

    function _next(current, next) {
        current.onkeydown = (e) => {
            if (e.key == 'Enter') {
                e.preventDefault();
                next.focus();
            }
        }
    }
    //限制长度
    function LimitEditableLength(editableDiv, maxlength) {
        let text = editableDiv.textContent || "";
        if (text.length > maxlength) {
            editableDiv.textContent = text.substring(0, maxlength);
            moveCursorToEnd(editableDiv);
        }
    }
    function _addEvent(dom) {
        // 监听粘贴事件，清理粘贴的内容
        handlePaste(dom);
        const menu = getDomFromId('menu');
        const target = dom.closest('[contenteditable][data-placeholder]');
        dom.addEventListener('focusin', () => {
            if (target && target.textContent === target.getAttribute('data-placeholder')) {
                target.textContent = '';
                target.style.color = '';
                target.style.backgroundColor = '';
            }
            moveCursorToEnd(dom);
        });
        dom.addEventListener('focusout', () => {
            if (target && !target.textContent.trim()) {
                target.textContent = target.getAttribute('data-placeholder');
                if (target.id == 'editor_tag') {
                    target.style.color = 'var(--TAG_COLOR)';
                } else {
                    target.style.color = 'color-mix(in srgb, var(--DESC_COLOR) 50%, white 50%)';
                }
            }
            menu.style.opacity = '1';
            menu.style.pointerEvents = 'all';
        });
        dom.addEventListener('input', () => {
            cacheEditor(mode, editorPanl);
        })
    }
    function tagInput() {
        if (isComposing) {
            return;
        }
        clearTimeout(debounceTimer); // 清除之前的延迟
        LimitEditableLength(tag, 16);
        centent.style.textIndent = tag.clientWidth / 12 + 0.8 + "rem";
        if (tag.textContent == '') {
            fillcount = 0;
            tag.textContent = tag.getAttribute('data-placeholder');
            tag.blur();
            tag.focus();
            centent.style.textIndent = tag.clientWidth / 12 + 0.8 + "rem";
        }
        if (rgbToHex(tag.style.color) !== '#45b17b') {
            tag.style.color = 'var(--CONTENT_COLOR)';
        }
        centent.style.textIndent = tag.clientWidth / 12 + 0.8 + "rem";
        get_fetch({
            api: 'tag_if',
            token: localStorage.getItem('token'),
            tag: tag.textContent
        }, (info => {
            const Data = JSON.parse(info).info;
            if (Data.code === 10401) {
                updateLoginStatus();
                return;
            }
            if (Data[0] == 1) {
                if (tag.innerText.length > fillcount) {
                    debounceTimer = setTimeout(() => {
                        tag.textContent = Data[1];
                        setTimeout(() => {
                            tag.style.color = '#45b17b'
                            tag.style.backgroundColor = '#d8eff1';
                        }, 100);
                        centent.style.textIndent = tag.clientWidth / 12 + 0.8 + "rem";
                        moveCursorToEnd(tag);
                        fillcount = tag.innerText.length;
                    }, 800);
                } else {
                    tag.style.backgroundColor = '';
                    tag.style.color = '';
                    fillcount--;
                }
            } else if (Data[0] == 2) {
                tag.style.color = '#45b17b';
                tag.style.backgroundColor = '#d8eff1';
            } else {
                tag.style.color = 'var(--CONTENT_COLOR)';
                tag.style.backgroundColor = '#f3f3f3';
            }

        }))

    }
}

function changePost(e) {
    if (getDomFromId('editor')) {
        getDomFromId('CancelPost').click();
        setTimeout(() => {
            _add();
        }, 400);
    } else {
        _add();
    }
    async function _add() {
        const dom = e.closest('.post');
        try {
            getDomFromId('PostMenu').remove();
            getDomFromId('PostMenu1').remove();
        } catch (e) { }
        domBackup = dom.cloneNode(true);
        dom.setAttribute('id', 'editor');
        dom.classList.add('editor');
        dom.classList.contains('post_pin') ? '' : dom.classList.add('post_pin_disable');
        dom.classList.contains('post_hidden') ? '' : dom.classList.add('post_hidden_disable');
        dom.style.opacity = 1;
        dom.dataset.mode = 'update';
        dom.querySelector('.Revise').remove();
        const title = dom.querySelector('.title h1');
        title.id = 'editor_title';
        title.dataset.placeholder = "输入标题";
        title.setAttribute('contenteditable', true);

        if (title.textContent.startsWith('Encryption=')) {
            title.innerHTML = await tryDecrypt(title.textContent);
        }

        const tag = dom.querySelector('.tag');
        tag.id = 'editor_tag';
        tag.classList.add('icon-topic');
        tag.style.cssText = 'float:left;position:relative;z-index:10;';
        tag.dataset.placeholder = "默认";
        tag.setAttribute('contenteditable', true);
        const tempContent = dom.querySelector('.content');
        
        // 在 wrapChildrenWithTag 之前，尝试从多个来源获取原始 Markdown 文本
        let savedMarkdown = null;
        
        // 来源1：全局存储（最可靠）
        if (window._markdownRawStore) {
            savedMarkdown = window._markdownRawStore.get(tempContent);
            if (!savedMarkdown) {
                const postIndex = Array.from(document.querySelectorAll('.post .content')).indexOf(tempContent);
                savedMarkdown = window._markdownRawStore.get('post_' + postIndex);
            }
        }
        
        // 来源2：dataset 属性
        if (!savedMarkdown) {
            savedMarkdown = tempContent.dataset.rawMarkdown || 
                            tempContent.querySelector('.markdown-body')?.dataset.rawMarkdown;
        }
        
        // 来源3：module.js 设置的 data-raw-markdown 属性（最直接）
        if (!savedMarkdown && tempContent.hasAttribute('data-raw-markdown')) {
            savedMarkdown = tempContent.getAttribute('data-raw-markdown');
            console.log('[Editor] 从 data-raw-markdown 属性获取原始内容');
        }
        
        if (savedMarkdown) {
            console.log('[Editor] 找到原始 Markdown 内容，长度:', savedMarkdown.length);
        } else {
            console.log('[Editor] ⚠ 未找到原始 Markdown，当前内容:', 
                tempContent.textContent.substring(0, 100));
        }
        
        const content = wrapChildrenWithTag(tempContent, 'div');
        tempContent.removeAttribute('style');
        tempContent.insertBefore(tag, tempContent.children[0]);


        tempContent.style.maxHeight = '38rem';
        setTimeout(() => {
            tempContent.style.maxHeight = tempContent.scrollHeight + 'px';
        }, 0);

        setTimeout(() => {
            tempContent.style.maxHeight = '100%';
            dom.querySelector('.readmore') ? dom.querySelector('.readmore').remove() : '';
        }, 300);

        content.id = 'editor_content';
        content.dataset.placeholder = "请输入内容...";
        content.setAttribute('contenteditable', true);

        if (typeof getMarkdownToolbar === 'function') {
            var existingToolbar = dom.querySelector('.editor-toolbar-wrapper');
            if (!existingToolbar) {
                var toolbarWrapper = document.createElement('div');
                toolbarWrapper.className = 'editor-toolbar-wrapper';
                toolbarWrapper.innerHTML = getMarkdownToolbar();
                tempContent.parentNode.insertBefore(toolbarWrapper, tempContent.nextSibling);
            }
        }

        var editorToolbar = dom.querySelector('.editor-toolbar-wrapper');
        if (editorToolbar) {
            editorToolbar.parentNode.insertBefore(content, editorToolbar.nextSibling);
        }

        if ((content.textContent.trim()).startsWith('Encryption=')) {
            content.innerHTML = await tryDecrypt(content.textContent);
        }
        
        // 恢复原始 Markdown 文本（使用之前提取的 savedMarkdown）
        if (savedMarkdown) {
            console.log('[Editor] ✓ 方案1: 从存储恢复原始 Markdown 内容');
            content.innerHTML = '';
            content.textContent = savedMarkdown;
        } else if (content.querySelector('.markdown-body') && typeof htmlToMarkdown === 'function') {
            // 兜底方案：将渲染后的 HTML 转换回 Markdown
            const mdBody = content.querySelector('.markdown-body');
            console.log('[Editor] 方案2: htmlToMarkdown 反向转换');
            
            const recoveredMd = htmlToMarkdown(mdBody.innerHTML);
            console.log('[Editor] 转换结果长度:', recoveredMd.length, '前100字:', recoveredMd.substring(0, 100));
            
            content.innerHTML = '';
            content.textContent = recoveredMd;
        } else if (isPlainText(content)) {
            console.log('[Editor] 方案3: 纯文本内容');
            content.innerHTML = content.innerHTML.trim();
        } else {
            console.log('[Editor] ⚠ 未找到原始 Markdown，当前内容类型:', content.children.length > 0 ? 'HTML' : '文本');
            console.log('[Editor] 当前 innerHTML 前200字符:', content.innerHTML.substring(0, 200));
        }
        setTimeout(() => {
            content.blur();
            content.focus();
        }, 0);

        editor_focusin_hidden_menu(content)

        const annex = dom.querySelector('.annex');
        annex.classList.remove('md-annex-hidden');
        annex.className += ' file_upload';

        var existingGrid = dom.querySelector('.md-img-grid');
        if (existingGrid) {
            existingGrid.remove();
        }

        var collectedImgs = dom.querySelectorAll('.md-img-collected');
        collectedImgs.forEach(function(img) {
            img.classList.remove('md-img-collected');
        });
        Array.from(annex.children).forEach((item, key) => {
            const trash = createElement({ type: 'div', attributes: { className: 'icon-trash' } });
            item.appendChild(trash);
            trash.addEventListener('click', () => {
                if (!confirm('是否删除媒体？')) {
                    return;
                }
                ElementFade(item, false, true);
                item.style.transition = "all .2s";
            });
            if (key > 7) {
                item.classList.remove('annexh');
                if (item.classList.contains('more')) {
                    item.classList.remove('more');
                    item.querySelector('span').remove();
                }
            }
            item.setAttribute('draggable', false);
            item.querySelector('img').setAttribute('draggable', false);
            dragImage(item);
        });
        const meta = dom.querySelector('.meta').children;
        const _sha = dom.querySelector('.meta').querySelector('.icon-share');
        _sha ? _sha.remove() : '';
        meta[0].id = 'editor_weather';
        meta[0].children[0].style.display = 'block';
        meta[1].id = 'editor_location';
        meta[1].setAttribute('contenteditable', true);
        const time = meta[2].children;
        time[0].id = 'editor_date';
        time[1].id = 'editor_time';
        time[1].setAttribute('contenteditable', true);
        meta[2].appendChild(createElement({ type: 'input', attributes: { id: 'hidden_meta', type: 'text', style: 'opacity:0;width:0;height:0;', disabled: true } }));
        PostEditorPanel('update');
    }
}

function deletePost(e) {
    if (!confirm('确认要删除吗？')) {
        return;
    }
    const dom = e.closest('.post');
    const id = dom.dataset.id;
    get_fetch({
        api: 'delete_post',
        token: localStorage.getItem('token'),
        id: id
    }, (data) => {
        const Data = JSON.parse(data);
        if (Data.code === 10401) {
            updateLoginStatus();
            return;
        }
        if (Data.code == 10200) {
            dom.style.height = dom.clientHeight + 'px';
            let h = dom.clientHeight;
            setTimeout(() => {
                dom.style.height = '0px';
            }, 1);
            dom.setAttribute('style', 'margin-top: -1.5rem !important;min-height: 0px; overflow: hidden');
            showBubble('删除内容成功', 'success');
            setTimeout(() => {
                dom.remove();
            }, 2000);
            try {
                if (dom.nextElementSibling.className == 'date' && dom.previousElementSibling.className == 'date') {
                    dom.previousElementSibling.remove();
                }
            } catch (e) { }
            get_tags();
            get_yearmonth();
        } else {
            showBubble('删除内容失败', 'error');
            console.log(data)
        }
    });
}

function archivePost(e) {
    if (!confirm('归档/取消归档？')) {
        return;
    }
    const dom = e.closest('.post');
    const id = dom.dataset.id;
    get_fetch({
        api: 'archive_post',
        token: localStorage.getItem('token'),
        id: id
    }, (data) => {
        const Data = JSON.parse(data);
        if (Data.code === 10401) {
            updateLoginStatus();
            return;
        }
        if (Data.code == 10200) {
            if (Data.mode == 1) {
                showBubble('已设置归档', 'success');
            } else {
                showBubble('移除归档', 'success');
            }
            dom.style.maxHeight = dom.clientHeight + 'px';
            dom.replaceChildren();
            dom.style.maxHeight = '0px';
            dom.style.minHeight = '0px';
            setTimeout(() => {
                dom.remove();
            }, 200);
            try {
                if (dom.nextElementSibling.className == 'date' && dom.previousElementSibling.className == 'date') {
                    dom.previousElementSibling.remove();
                }
            } catch (e) { }
            get_tags();
            get_yearmonth();
        }
    });

}