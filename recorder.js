// ==UserScript==
// @name         Alist-Video-Progress-Recorder
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  修复记录视频名称在切换界面后被覆盖的问题
// @author       hope140
// @match        https://alist.510711.xyz/*
// @match        http://192.168.0.100:5244/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let playbackHistory = [];
    let currentVideoUrl = '';  // 用于保存首次检测到的视频URL

    // 时间格式化函数
    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
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

    // 提取视频名称
    function extractFileName(url) {
        if (!url) return null;
        const decodedUrl = decodeURIComponent(url);
        const fileNameWithExtension = decodedUrl.split('/').pop();
        const fileName = fileNameWithExtension.replace(/\.[^/.]+$/, '');
        return fileName;
    }

    // 保存视频进度
    function saveVideoProgress(videoUrl, currentTime, duration) {
        let videoHistory = JSON.parse(localStorage.getItem('videoPlaybackHistory')) || [];
        const existingRecordIndex = videoHistory.findIndex(record => record.url === videoUrl);

        let isWatched = currentTime >= duration - 30;

        if (existingRecordIndex !== -1) {
            videoHistory[existingRecordIndex].time = currentTime;
            videoHistory[existingRecordIndex].date = new Date().toLocaleString();
            videoHistory[existingRecordIndex].isWatched = isWatched;
            videoHistory[existingRecordIndex].duration = duration;
        } else {
            videoHistory.unshift({
                url: videoUrl,
                time: currentTime,
                date: new Date().toLocaleString(),
                isWatched: isWatched,
                duration: duration
            });
        }

        if (videoHistory.length > 5) {
            videoHistory.pop();
        }

        videoHistory = videoHistory.filter(record => record.url && extractFileName(record.url));
        localStorage.setItem('videoPlaybackHistory', JSON.stringify(videoHistory));
    }

    // 加载播放历史
    function loadPlaybackHistory() {
        playbackHistory = JSON.parse(localStorage.getItem('videoPlaybackHistory')) || [];
        playbackHistory = playbackHistory.filter(record => record.url && extractFileName(record.url));
        playbackHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem('videoPlaybackHistory', JSON.stringify(playbackHistory));
        return playbackHistory;
    }

    // 创建播放记录按钮
    function createHistoryButton() {
        const historyButton = document.createElement('button');
        historyButton.innerHTML = '📜';
        historyButton.style.position = 'fixed';
        historyButton.style.top = '20px';
        historyButton.style.left = '20px';
        historyButton.style.zIndex = '9999';
        historyButton.style.padding = '10px';
        historyButton.style.fontSize = '24px';
        historyButton.style.backgroundColor = '#007BFF';
        historyButton.style.color = '#fff';
        historyButton.style.border = 'none';
        historyButton.style.borderRadius = '5px';
        historyButton.style.cursor = 'pointer';

        document.body.appendChild(historyButton);
        historyButton.addEventListener('click', togglePlaybackHistory);
    }

    // 切换显示/隐藏播放记录
    function togglePlaybackHistory() {
        const existingModal = document.querySelector('#historyModal');
        if (existingModal) {
            existingModal.remove();
        } else {
            displayPlaybackHistory();
        }
    }

    // 展示播放记录
    function displayPlaybackHistory() {
        loadPlaybackHistory();

        const modal = document.createElement('div');
        modal.id = 'historyModal';
        modal.style.position = 'absolute';
        modal.style.top = '60px';
        modal.style.left = '20px';
        modal.style.zIndex = '10000';
        modal.style.padding = '10px';
        modal.style.backgroundColor = '#fff';
        modal.style.border = '1px solid #ccc';
        modal.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        modal.style.borderRadius = '8px';
        modal.style.maxWidth = '400px';

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

                recordItem.addEventListener('mouseover', () => {
                    recordItem.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                });
                recordItem.addEventListener('mouseout', () => {
                    recordItem.style.boxShadow = 'none';
                });

                const fileName = extractFileName(record.url);
                const shortFileName = fileName.length > 20 ? fileName.slice(0, 20) + '...' : fileName;
                const formattedTime = record.isWatched ? '已看完' : `${formatTime(record.time)} / ${formatTime(record.duration)}`;
                const formattedDate = formatDate(record.date);

                const recordItemContent = `
                    <strong>#${index + 1}</strong> ${shortFileName}<br>
                    <div style="display: flex; justify-content: flex-end;">
                        <small>${formattedTime} | ${formattedDate}</small>
                    </div>
                `;

                recordItem.innerHTML = recordItemContent;
                recordItem.addEventListener('click', () => {
                    window.location.href = record.url;
                });

                modal.appendChild(recordItem);
            });
        }

        document.body.appendChild(modal);
    }

    // 监测播放器并绑定事件
    function monitorVideoByClass() {
        const intervalId = setInterval(() => {
            const videoElement = document.querySelector('.art-video');

            if (videoElement) {
                clearInterval(intervalId);
                console.log('art-video 视频元素已检测到');

                if (!currentVideoUrl) {
                    currentVideoUrl = window.location.href;  // 只在首次播放时保存视频URL
                }

                videoElement.addEventListener('timeupdate', () => {
                    const currentTime = videoElement.currentTime;
                    const duration = videoElement.duration;

                    if (Math.floor(currentTime) % 5 === 0) {
                        saveVideoProgress(currentVideoUrl, currentTime, duration);
                    }
                });

                window.addEventListener('beforeunload', () => {
                    saveVideoProgress(currentVideoUrl, videoElement.currentTime, videoElement.duration);
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
