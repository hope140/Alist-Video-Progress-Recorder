// ==UserScript==
// @name         Alist-Video-Progress-Recorder
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  记录并恢复视频的播放进度
// @author       hope140
// @match        https://alist.510711.xyz/*
// @match        http://192.168.0.100:5244/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 定义保存视频进度的函数
    function saveVideoProgress(videoElement) {
        const videoUrl = videoElement.currentSrc;
        const currentTime = videoElement.currentTime;
        localStorage.setItem('videoProgress_' + videoUrl, currentTime);
        console.log(`进度已保存: ${currentTime}`);
    }

    // 定义加载视频进度的函数
    function loadVideoProgress(videoElement) {
        const videoUrl = videoElement.currentSrc;
        const savedTime = localStorage.getItem('videoProgress_' + videoUrl);
        if (savedTime) {
            videoElement.currentTime = parseFloat(savedTime);
            console.log(`进度已恢复: ${savedTime}`);
        }
    }

    // 查找页面上的所有<video>标签
    const videos = document.querySelectorAll('video');

    // 为每个视频添加事件监听
    videos.forEach(video => {
        // 页面加载时恢复播放进度
        video.addEventListener('loadedmetadata', () => {
            loadVideoProgress(video);
        });

        // 每隔5秒保存一次进度
        video.addEventListener('timeupdate', () => {
            if (Math.floor(video.currentTime) % 5 === 0) {
                saveVideoProgress(video);
            }
        });

        // 页面卸载时保存进度
        window.addEventListener('beforeunload', () => {
            saveVideoProgress(video);
        });
    });
})();
