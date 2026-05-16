<div class="upper">
    <header>
        <div class="topbar">
            <button id="newpost_B"
                class="mybutton dark icon-editor <?php echo $_SESSION['is_lg_ok'] ? '' : 'hidden'; ?>"></button>
            <button id="setting_B"
                class="mybutton dark icon-settings <?php echo $_SESSION['is_lg_ok'] ? '' : 'hidden'; ?>"></button>
            <button id="login_B" class="mybutton dark <?php echo $_SESSION['is_lg_ok'] ? 'icon-exit' : 'icon-user'; ?>"
                data-status="<?php echo $_SESSION['is_lg_ok'] ? '1' : '0'; ?>"></button>
        </div>
        <div class="userinfo">
            <div class="user">
                <img class='avatar' src="/kernel/asset/img/avatar.webp?v=<?php echo $_ENV['CACHE'] ?>" alt="avatar">
                <h2><?php echo $_ENV['USER_NAME'] ?><?php
                    $emailDiv = sprintf("<button class=' mybutton mailtobutton light icon-email' onclick='location.href = \"mailto\:%s?subject=来自%s的网站留言\"'></button>", $_ENV['USER_EMAIL'], $_ENV['SITE_TITLE']);
                    echo $_ENV['USER_EMAIL'] !== '' ? $emailDiv : '';
                    ?>
                </h2>
                <p><?php echo $_ENV['USER_SIGN'] !== '' ? $_ENV['USER_SIGN'] : ''; ?></p>
                <div class="social">
                    <?php
                    foreach (json_decode($_ENV['SOCIAL_MEDIA']) as $key => $link) {
                        echo "<button class='mybutton socialbutton light icon-$key' data-href='$link'></button>";
                    }
                    ?>
                </div>
            </div>
            <div class="background">
                <img src="/kernel/asset/img/background.webp?v=<?php echo $_ENV['CACHE'] ?>" alt="background">
            </div>
        </div>
    </header>
</div>
<div class="lower">
    <aside id="menu" data-s="<?php echo $_ENV['PSEUDO_STATIC'] ?>" data-l="<?php echo $_ENV['LOCATION_SHOW_MODE'] ?>" <?php echo $_SESSION['is_lg_ok'] ? ' data-z="' . $_ENV['PICTURE_ZIP'] . '"' : ''; ?><?php echo $_SESSION['is_lg_ok'] ? ' data-e="' . $_ENV['PICTURE_ENCRYPTION'] . '"' : ''; ?><?php echo $_SESSION['is_lg_ok'] ? ' data-c="' . $_ENV['CORS'] . '"' : '' ?><?php echo $_SESSION['is_lg_ok'] ? ' data-t="' . $_ENV['DEFAULT_TAG'] . '"' : '' ?>>
        <div class="filter"><button id="tags_B" class="mybutton dark icon-tags"></button></div>
        <div class="current"><button id="current_B" class="mybutton dark current-date" disabled
                style="display: none;"></button></div>
        <div class="search"><button id="search_B" class="mybutton dark icon-search"></button></div>
    </aside>