// ==UserScript==
// @name         Alist-Video-Progress-Recorder
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  记录点击跳转、时间显示优化、状态显示“已看完”
// @author       hope140
// @match        https://alist.510711.xyz/*
// @match        http://192.168.0.100:5244/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let playbackHistory = [];

    // 时间格式化函数，将秒数转化为 "xx:xx:xx" 的格式
    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    // 记录时间格式化函数
    function formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        if (date.toDateString() === today.toDateString()) {
            return `今天 ${hours}:${minutes}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `昨天 ${hours}:${minutes}`;
        } else {
            return `${date.getMonth() + 1}-${date.getDate()} ${hours}:${minutes}`;
        }
    }

    // 去除URL中的域名/IP和文件扩展名，提取视频名称
    function extractFileName(url) {
        const decodedUrl = decodeURIComponent(url);
        const fileNameWithExtension = decodedUrl.split('/').pop(); // 获取最后一部分
        const fileName = fileNameWithExtension.replace(/\.[^/.]+$/, ''); // 去除扩展名
        return fileName;
    }

    // 定义保存视频进度的函数
    function saveVideoProgress(videoUrl, currentTime, duration) {
        let videoHistory = JSON.parse(localStorage.getItem('videoPlaybackHistory')) || [];
        const existingRecordIndex = videoHistory.findIndex(record => record.url === videoUrl);

        let isWatched = currentTime >= duration - 30; // 如果当前时间接近视频时长，认为已看完

        if (existingRecordIndex !== -1) {
            videoHistory[existingRecordIndex].time = currentTime;
            videoHistory[existingRecordIndex].date = new Date().toLocaleString();
            videoHistory[existingRecordIndex].isWatched = isWatched;
            videoHistory[existingRecordIndex].duration = duration;
        } else {
            videoHistory.push({
                url: videoUrl,
                time: currentTime,
                date: new Date().toLocaleString(),
                isWatched: isWatched,
                duration: duration
            });
        }

        if (videoHistory.length > 5) {
            videoHistory.shift(); // 限制为最近的五条记录
        }

        localStorage.setItem('videoPlaybackHistory', JSON.stringify(videoHistory));
    }

    // 定义加载播放历史的函数
    function loadPlaybackHistory() {
        playbackHistory = JSON.parse(localStorage.getItem('videoPlaybackHistory')) || [];
        return playbackHistory;
    }

    // 创建播放记录按钮
    function createHistoryButton() {
        const historyButton = document.createElement('button');
        historyButton.innerHTML = '📜';
        historyButton.style.position = 'fixed';
        historyButton.style.top = '20px';
        historyButton.style.left = '20px'; // 左侧放置按钮
        historyButton.style.zIndex = '9999';
        historyButton.style.padding = '10px';
        historyButton.style.fontSize = '24px';
        historyButton.style.backgroundColor = '#007BFF';
        historyButton.style.color = '#fff';
        historyButton.style.border = 'none';
        historyButton.style.borderRadius = '5px'; // 圆角按钮
        historyButton.style.cursor = 'pointer';

        document.body.appendChild(historyButton);

        // 点击按钮显示/关闭记录
        historyButton.addEventListener('click', togglePlaybackHistory);
    }

    // 切换显示/隐藏播放记录弹窗
    function togglePlaybackHistory() {
        const existingModal = document.querySelector('#historyModal');
        if (existingModal) {
            existingModal.remove();
        } else {
            displayPlaybackHistory();
        }
    }

    // 创建并展示播放记录弹窗
    function displayPlaybackHistory() {
        loadPlaybackHistory();

        const modal = document.createElement('div');
        modal.id = 'historyModal';
        modal.style.position = 'absolute';
        modal.style.top = '60px'; // 紧贴按钮下方
        modal.style.left = '20px'; // 紧贴左侧按钮
        modal.style.zIndex = '10000';
        modal.style.padding = '10px';
        modal.style.backgroundColor = '#fff';
        modal.style.border = '1px solid #ccc';
        modal.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        modal.style.borderRadius = '8px'; // 圆角设计
        modal.style.maxWidth = '400px'; // 自适应宽度

        // 展示播放记录
        if (playbackHistory.length === 0) {
            const noHistory = document.createElement('p');
            noHistory.textContent = '没有播放记录';
            modal.appendChild(noHistory);
        } else {
            playbackHistory.forEach((record, index) => {
                const recordItem = document.createElement('div');
                recordItem.style.padding = '5px 0';
                recordItem.style.borderBottom = '1px solid #eee';
                recordItem.style.cursor = 'pointer';
                recordItem.style.transition = 'box-shadow 0.3s';
                recordItem.style.boxShadow = 'none';

                // 鼠标移入移出效果
                recordItem.addEventListener('mouseover', () => {
                    recordItem.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                });
                recordItem.addEventListener('mouseout', () => {
                    recordItem.style.boxShadow = 'none';
                });

                const fileName = extractFileName(record.url);
                const formattedTime = record.isWatched ? '已看完' : `${formatTime(record.time)}/${formatTime(record.duration)}`;
                const formattedDate = formatDate(record.date);

                recordItem.innerHTML = `
                    <strong>#${index + 1}</strong> ${fileName}<br>
                    <small>${formattedTime} | ${formattedDate}</small>
                `;

                // 点击记录跳转到对应视频
                recordItem.addEventListener('click', () => {
                    window.location.href = record.url;
                });

                modal.appendChild(recordItem);
            });
        }

        document.body.appendChild(modal);
    }

    // 查找art-video播放器并绑定事件
    function monitorVideoByClass() {
        const intervalId = setInterval(() => {
            const videoElement = document.querySelector('.art-video');

            if (videoElement) {
                clearInterval(intervalId);
                console.log('art-video 视频元素已检测到');

                videoElement.addEventListener('timeupdate', () => {
                    const currentTime = videoElement.currentTime;
                    const duration = videoElement.duration;
                    const videoUrl = window.location.href;

                    if (Math.floor(currentTime) % 5 === 0) {
                        saveVideoProgress(videoUrl, currentTime, duration);
                    }
                });

                window.addEventListener('beforeunload', () => {
                    saveVideoProgress(window.location.href, videoElement.currentTime, videoElement.duration);
                });
            }
        }, 1000);
    }

    function init() {
        createHistoryButton();
        monitorVideoByClass();
    }

    window.addEventListener('load', init);
})();
