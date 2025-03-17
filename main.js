document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('userInput');
    const generateBtn = document.getElementById('generateBtn');
    const preview = document.getElementById('preview');
    const history = document.getElementById('history');
    const modelSelect = document.getElementById('modelSelect');
    
    // 知识库相关元素
    const knowledgeTitle = document.getElementById('knowledgeTitle');
    const knowledgeContent = document.getElementById('knowledgeContent');
    const saveKnowledge = document.getElementById('saveKnowledge');
    const clearKnowledge = document.getElementById('clearKnowledge');
    const knowledgeList = document.getElementById('knowledgeList');
    const useKnowledge = document.getElementById('useKnowledge');
    const fileUpload = document.getElementById('fileUpload');
    const uploadBtn = document.getElementById('uploadBtn');

    console.log('页面加载完成，开始初始化...');

    // 检查 marked 是否已加载
    if (typeof marked === 'undefined') {
        console.error('Marked.js 未加载，正在重新加载...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked@4.0.0/marked.min.js';
        script.onload = () => console.log('Marked.js 加载成功');
        script.onerror = () => console.error('Marked.js 加载失败');
        document.head.appendChild(script);
    }

    // 安全的 Markdown 渲染函数
    function safeMarkdownParse(text) {
        try {
            return typeof marked !== 'undefined' ? marked.parse(text) : text;
        } catch (e) {
            console.error('Markdown 渲染失败:', e);
            return text;
        }
    }

    // 知识库管理
    let knowledgeBase = JSON.parse(localStorage.getItem('knowledgeBase')) || [];

    // 保存知识到本地存储
    function saveToLocalStorage() {
        localStorage.setItem('knowledgeBase', JSON.stringify(knowledgeBase));
    }

    // 处理文件上传
    async function handleFileUpload() {
        const file = fileUpload.files[0];
        if (!file) {
            alert('请选择要上传的文件');
            return;
        }

        try {
            const content = await file.text();
            const fileExt = file.name.split('.').pop().toLowerCase();

            let newKnowledge = [];

            switch (fileExt) {
                case 'json':
                    try {
                        const jsonData = JSON.parse(content);
                        if (Array.isArray(jsonData)) {
                            newKnowledge = jsonData.filter(item => 
                                item && typeof item === 'object' && 
                                typeof item.title === 'string' && 
                                typeof item.content === 'string'
                            );
                        } else {
                            throw new Error('JSON 文件必须包含知识点数组');
                        }
                    } catch (e) {
                        alert('JSON 格式错误：' + e.message);
                        return;
                    }
                    break;

                case 'md':
                    // 将 Markdown 文件按照标题分割
                    const sections = content.split(/(?=^#{1,3} )/m);
                    newKnowledge = sections
                        .filter(section => section.trim())
                        .map(section => {
                            const lines = section.trim().split('\n');
                            const title = lines[0].replace(/^#{1,3} /, '').trim();
                            const content = lines.slice(1).join('\n').trim();
                            return { title, content };
                        });
                    break;

                case 'txt':
                    // 将文本文件按照空行分割为段落
                    const paragraphs = content.split(/\n\s*\n/);
                    newKnowledge = paragraphs
                        .filter(para => para.trim())
                        .map((para, index) => ({
                            title: `段落 ${index + 1}`,
                            content: para.trim()
                        }));
                    break;

                default:
                    alert('不支持的文件格式');
                    return;
            }

            if (newKnowledge.length === 0) {
                alert('未找到有效的知识点');
                return;
            }

            // 添加新知识到知识库
            knowledgeBase = [...knowledgeBase, ...newKnowledge];
            saveToLocalStorage();
            renderKnowledgeList();
            
            // 清空文件输入
            fileUpload.value = '';
            
            alert(`成功导入 ${newKnowledge.length} 条知识`);

        } catch (error) {
            console.error('文件处理错误:', error);
            alert('文件处理失败：' + error.message);
        }
    }

    // 文件上传按钮事件监听
    uploadBtn.addEventListener('click', handleFileUpload);

    // 渲染知识库列表
    function renderKnowledgeList() {
        knowledgeList.innerHTML = '';
        knowledgeBase.forEach((item, index) => {
            const element = document.createElement('div');
            element.className = 'bg-gray-50 p-4 rounded-lg';
            element.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-gray-800">${item.title}</h4>
                        <p class="text-gray-600 text-sm mt-1">${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}</p>
                    </div>
                    <button class="text-red-500 hover:text-red-600 delete-knowledge" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            knowledgeList.appendChild(element);
        });

        // 添加删除事件监听
        document.querySelectorAll('.delete-knowledge').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                knowledgeBase.splice(index, 1);
                saveToLocalStorage();
                renderKnowledgeList();
            });
        });
    }

    // 初始化知识库列表
    renderKnowledgeList();

    // 保存知识
    saveKnowledge.addEventListener('click', () => {
        const title = knowledgeTitle.value.trim();
        const content = knowledgeContent.value.trim();
        
        if (!title || !content) {
            alert('标题和内容不能为空！');
            return;
        }

        knowledgeBase.push({ title, content });
        saveToLocalStorage();
        renderKnowledgeList();

        // 清空输入框
        knowledgeTitle.value = '';
        knowledgeContent.value = '';
    });

    // 清空知识库
    clearKnowledge.addEventListener('click', () => {
        if (confirm('确定要清空知识库吗？此操作不可恢复！')) {
            knowledgeBase = [];
            saveToLocalStorage();
            renderKnowledgeList();
        }
    });

    // 生成内容
    async function generateContent() {
        console.log('开始生成内容...');
        const prompt = userInput.value.trim();
        if (!prompt) {
            console.warn('输入内容为空');
            return;
        }

        // 添加加载状态
        generateBtn.classList.add('loading');
        generateBtn.disabled = true;
        preview.innerHTML = '<p class="text-gray-500">正在生成内容...</p>';
        
        let fullResponse = '';
        console.log('准备发送请求，提示词：', prompt);

        try {
            console.log('正在连接到本地模型服务...');

            // 构建提示词，如果启用了知识库，则加入相关知识
            let finalPrompt = prompt;
            if (useKnowledge.checked && knowledgeBase.length > 0) {
                const relevantKnowledge = knowledgeBase
                    .map(k => `${k.title}:\n${k.content}`)
                    .join('\n\n');
                finalPrompt = `基于以下知识回答问题：\n\n${relevantKnowledge}\n\n问题：${prompt}`;
            }

            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: finalPrompt,
                    model: modelSelect.value,
                    stream: true
                })
            });

            console.log('收到服务器响应:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`网络请求失败: ${response.status} ${response.statusText}`);
            }

            // 获取响应的 reader
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const {value, done} = await reader.read();
                if (done) {
                    console.log('响应流结束');
                    break;
                }
                
                // 解码响应数据
                const chunk = decoder.decode(value);
                console.log('收到数据块:', chunk);
                
                // 将响应按换行符分割，处理每个 JSON 对象
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        console.log('解析的JSON数据:', data);
                        
                        // 只关注实际的响应内容
                        if (data.response && !data.response.includes('<think>') && !data.response.includes('</think>')) {
                            fullResponse += data.response;
                            // 实时更新预览区域，使用安全的渲染函数
                            preview.innerHTML = safeMarkdownParse(fullResponse);
                        }
                    } catch (e) {
                        console.error('解析响应数据失败:', e, '原始数据:', line);
                    }
                }
            }

            console.log('生成完成，完整响应:', fullResponse);
            // 添加到历史记录
            addToHistory(prompt, fullResponse);

        } catch (error) {
            console.error('发生错误:', error);
            preview.innerHTML = `<p class="text-red-500">错误：${error.message}</p>`;
        } finally {
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
            console.log('生成过程结束');
        }
    }

    // 添加到历史记录
    function addToHistory(prompt, response) {
        console.log('添加历史记录');
        const historyItem = document.createElement('div');
        historyItem.className = 'bg-white p-4 rounded-lg shadow-sm';
        historyItem.innerHTML = `
            <div class="text-sm text-gray-500 mb-2">问题：${prompt}</div>
            <div class="prose">${safeMarkdownParse(response)}</div>
        `;
        
        // 将新的历史记录插入到最前面
        if (history.firstChild) {
            history.insertBefore(historyItem, history.firstChild);
        } else {
            history.appendChild(historyItem);
        }

        // 限制历史记录数量
        while (history.children.length > 10) {
            history.removeChild(history.lastChild);
        }
    }

    // 事件监听
    generateBtn.addEventListener('click', () => {
        console.log('生成按钮被点击');
        generateContent();
    });
    
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            console.log('检测到 Ctrl+Enter');
            generateContent();
        }
    });

    console.log('初始化完成');
}); 