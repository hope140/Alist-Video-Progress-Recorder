// ==UserScript==
// @name         Alist-Video-Progress-Recorder
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  优化播放记录界面，显示解码的URL、格式化时间，并使用图标按钮
// @author       hope140
// @match        https://alist.510711.xyz/*
// @match        http://192.168.0.100:5244/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 全局变量
    let playbackHistory = [];

    // 时间格式化函数，将秒数转化为 "xx:xx:xx" 的格式
    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    // 定义保存视频进度的函数
    function saveVideoProgress(videoUrl, currentTime) {
        // 获取之前的播放记录
        let videoHistory = JSON.parse(localStorage.getItem('videoPlaybackHistory')) || [];
        console.log(`保存视频进度: URL = ${videoUrl}, currentTime = ${currentTime}`);

        // 检查当前视频是否已存在于记录中
        const existingRecordIndex = videoHistory.findIndex(record => record.url === videoUrl);

        if (existingRecordIndex !== -1) {
            // 如果存在，更新当前进度
            videoHistory[existingRecordIndex].time = currentTime;
            videoHistory[existingRecordIndex].date = new Date().toLocaleString();
        } else {
            // 如果不存在，新增记录
            videoHistory.push({
                url: videoUrl,
                time: currentTime,
                date: new Date().toLocaleString()
            });
        }

        // 限制为最近的五条记录
        if (videoHistory.length > 5) {
            videoHistory.shift(); // 删除最早的一条记录
        }

        // 保存到 localStorage
        localStorage.setItem('videoPlaybackHistory', JSON.stringify(videoHistory));
        console.log(`播放进度已保存，当前记录:`, videoHistory);
    }

    // 定义加载播放历史的函数
    function loadPlaybackHistory() {
        playbackHistory = JSON.parse(localStorage.getItem('videoPlaybackHistory')) || [];
        console.log('加载播放历史:', playbackHistory);
        return playbackHistory;
    }

    // 创建播放记录图标按钮
    function createHistoryButton() {
        const historyButton = document.createElement('button');
        historyButton.innerHTML = '📜'; // 使用常见的播放记录图标替代文本
        historyButton.style.position = 'fixed';
        historyButton.style.top = '20px';
        historyButton.style.right = '20px';
        historyButton.style.zIndex = '9999';
        historyButton.style.padding = '10px';
        historyButton.style.fontSize = '24px'; // 调整图标大小
        historyButton.style.backgroundColor = 'transparent';
        historyButton.style.border = 'none';
        historyButton.style.cursor = 'pointer';

        document.body.appendChild(historyButton);

        // 点击图标显示或关闭记录
        historyButton.addEventListener('click', togglePlaybackHistory);
        console.log('播放记录按钮已创建');
    }

    // 切换显示/隐藏播放记录弹窗
    function togglePlaybackHistory() {
        const existingModal = document.querySelector('#historyModal');
        if (existingModal) {
            existingModal.remove(); // 如果弹窗已存在，点击按钮时移除它
        } else {
            displayPlaybackHistory(); // 否则显示记录
        }
    }

    // 创建并展示播放记录弹窗
    function displayPlaybackHistory() {
        loadPlaybackHistory();

        // 创建弹窗容器
        const modal = document.createElement('div');
        modal.id = 'historyModal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.zIndex = '10000';
        modal.style.padding = '20px';
        modal.style.backgroundColor = '#fff';
        modal.style.border = '1px solid #ccc';
        modal.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        modal.style.width = '400px';

        // 添加关闭按钮
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '❌'; // 使用常见的关闭图标
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.float = 'right';

        closeButton.addEventListener('click', () => {
            modal.remove(); // 点击关闭按钮时移除弹窗
        });

        modal.appendChild(closeButton);

        // 展示播放记录
        if (playbackHistory.length === 0) {
            const noHistory = document.createElement('p');
            noHistory.textContent = '没有播放记录';
            modal.appendChild(noHistory);
        } else {
            playbackHistory.forEach((record, index) => {
                const recordItem = document.createElement('p');
                const decodedUrl = decodeURIComponent(record.url); // 解码URL
                recordItem.innerHTML = `<strong>#${index + 1}</strong> 视频URL: <a href="${decodedUrl}" target="_blank" style="color: blue; text-decoration: underline;">${decodedUrl}</a><br>播放时间: ${formatTime(record.time)}<br>记录时间: ${record.date}`;
                modal.appendChild(recordItem);
            });
        }

        document.body.appendChild(modal);
        console.log('播放记录弹窗已显示');
    }

    // 查找art-video播放器并绑定事件
    function monitorVideoByClass() {
        const intervalId = setInterval(() => {
            const videoElement = document.querySelector('.art-video');

            if (videoElement) {
                clearInterval(intervalId);
                console.log('art-video 视频元素已检测到');

                // 监听播放进度
                videoElement.addEventListener('timeupdate', () => {
                    const currentTime = videoElement.currentTime;
                    const videoUrl = window.location.href;  // 使用页面URL作为视频URL

                    console.log(`视频播放进度: URL = ${videoUrl}, 当前时间 = ${currentTime}`);

                    // 每隔5秒保存一次播放进度
                    if (Math.floor(currentTime) % 5 === 0) {
                        saveVideoProgress(videoUrl, currentTime);
                    }
                });

                // 页面卸载时保存进度
                window.addEventListener('beforeunload', () => {
                    console.log('页面即将关闭，保存播放进度');
                    saveVideoProgress(window.location.href, videoElement.currentTime);
                });
            } else {
                console.log('尚未检测到 .art-video 视频元素');
            }
        }, 1000); // 每秒检查一次
    }

    // 初始化函数
    function init() {
        console.log('初始化脚本...');
        createHistoryButton();
        monitorVideoByClass();
    }

    // 等待页面加载完成后执行
    window.addEventListener('load', init);
})();
