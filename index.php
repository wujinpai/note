<?php
$share = $_GET['id']??null;
foreach ([
    'functions.php',
    'head.php',
    'header.php',
    'content.php',
    'footer.php'
] as $file) {
    include "./kernel/$file";
}
