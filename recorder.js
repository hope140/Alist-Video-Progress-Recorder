// ==UserScript==
// @name         Alist-Video-Progress-Recorder
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  图标圆角化处理，去除边框
// @author       hope140
// @match        https://alist.510711.xyz/*
// @match        http://192.168.0.100:5244/*
// @exclude      https://alist.510711.xyz/@manage*
// @exclude      http://192.168.0.100:5244/@manage*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let playbackHistory = [];
    let currentVideoUrl = '';  // 用于保存首次检测到的视频URL
    let hoverTimeout;  // 记录鼠标悬停计时器

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
        const historyButton = document.createElement('div'); // 使用 div 作为按钮容器
        historyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="rgb(24, 144, 255)" id="history-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h10m-6 4h6" />
        </svg>
    `;
        historyButton.style.position = 'fixed';
        historyButton.style.top = '20px';
        historyButton.style.left = '20px';
        historyButton.style.zIndex = '9999';
        historyButton.style.padding = '5px';  // 添加内边距
        historyButton.style.background = 'white';  // 设置默认背景颜色
        historyButton.style.borderRadius = '10px';  // 添加圆角
        historyButton.style.cursor = 'pointer';
        historyButton.style.outline = 'none';  // 去掉点击时的黑色边框

        // 鼠标悬停时更改背景颜色和图标颜色
        historyButton.onmouseover = function() {
            historyButton.style.backgroundColor = 'rgb(24, 144, 255)'; // 鼠标悬停时背景变蓝
            const icon = document.getElementById('history-icon');
            icon.style.stroke = 'white';  // 鼠标悬停时图标变白
        };

        historyButton.onmouseout = function() {
            historyButton.style.backgroundColor = 'white'; // 鼠标移开时恢复背景色
            const icon = document.getElementById('history-icon');
            icon.style.stroke = 'rgb(24, 144, 255)'; // 恢复图标颜色
        };

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

    // 显示完整视频名称提示框
    function showFullTitleTooltip(recordItem, fullFileName) {
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip';
        tooltip.textContent = fullFileName;
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = '#fff';
        tooltip.style.border = '1px solid #ccc';
        tooltip.style.padding = '5px 10px';
        tooltip.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        tooltip.style.borderRadius = '5px';
        tooltip.style.zIndex = '10001';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.top = `${recordItem.getBoundingClientRect().top - 30}px`;  // 在记录项上方显示
        tooltip.style.left = `${recordItem.getBoundingClientRect().left}px`;

        document.body.appendChild(tooltip);

        recordItem.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.remove();
            clearTimeout(hoverTimeout);  // 清除计时器
        });
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

                    hoverTimeout = setTimeout(() => {
                        const fullFileName = extractFileName(record.url);
                        showFullTitleTooltip(recordItem, fullFileName);
                    }, 500);  // 0.5秒后显示完整名称
                });

                recordItem.addEventListener('mouseout', () => {
                    recordItem.style.boxShadow = 'none';
                    clearTimeout(hoverTimeout);  // 鼠标移出时取消显示
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

        // 点击空白处关闭播放记录界面
        document.addEventListener('click', function(event) {
            if (!modal.contains(event.target) && !document.querySelector('button').contains(event.target)) {
                modal.remove();  // 关闭播放记录窗口
            }
        }, true);
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
