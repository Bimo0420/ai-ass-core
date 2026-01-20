//Оставляет меньше информации 
let text = $input.item.json.output;

if (text && typeof text === 'string') {

    // === ФАЗА 1: Удаление целых блоков рассуждений ===

    // Паттерны для удаления целых строк/блоков (chain-of-thought на английском)
    const chainOfThoughtPatterns = [
        // Начало рассуждения
        /^[-•*]?\s*We need to\b.*$/gim,
        /^[-•*]?\s*We have\b.*$/gim,
        /^[-•*]?\s*We found\b.*$/gim,
        /^[-•*]?\s*We can\b.*$/gim,
        /^[-•*]?\s*Let's\b.*$/gim,
        /^[-•*]?\s*Let me\b.*$/gim,
        /^[-•*]?\s*Need to\b.*$/gim,
        /^[-•*]?\s*I need to\b.*$/gim,
        /^[-•*]?\s*From results?\b.*$/gim,
        /^[-•*]?\s*In document\b.*$/gim,
        /^[-•*]?\s*In results?\b.*$/gim,
        /^[-•*]?\s*Also\s+".*$/gim,
        /^[-•*]?\s*Thus answer:.*$/gim,
        /^[-•*]?\s*So\s+\w+.*$/gim,
        /^[-•*]?\s*But\s+\w+.*$/gim,
        /^[-•*]?\s*That\s+(is|answers?|would).*$/gim,
        /^[-•*]?\s*The\s+(project|document|answer|user|question).*$/gim,

        // Вопросы и задачи
        /^[-•*]?\s*Question:.*$/gim,
        /^[-•*]?\s*Task:.*$/gim,

        // Инструкции по форматированию
        /^[-•*]?\s*Provide\s+(answer|source|citation|example|JSON|bullet).*$/gim,
        /^[-•*]?\s*Use\s+(format|bullet|citation|short).*$/gim,
        /^[-•*]?\s*Cite\s+sources?.*$/gim,
        /^[-•*]?\s*No,?\s+just\s+answer.*$/gim,

        // Технические пометки
        /^[-•*]?\s*\[source[^\]]*\].*$/gim,
        /^[-•*]?\s*\(citation[^\)]*\).*$/gim,

        // Специфичные для вашего примера
        /^[-•*]?\s*[\w.]+\s+Provide source\.?.*$/gim,
        /^[-•*]?\s*\d+[\-–]\d+\s+days?\.?\s*Provide source\.?.*$/gim,
        /^[-•*]?\s*[A-Za-z\s]+not used\.?\s*Provide source\.?.*$/gim,
        /^[-•*]?\s*\d+\.?\d*\s*m\.?\s*Provide source\.?.*$/gim,
        /^[-•*]?\s*U\s*[≤<>=]+.*Provide source\.?.*$/gim,
        /^[-•*]?\s*,?\d+\s*руб.*Provide source\.?.*$/gim,

        // Строки полностью на английском с ключевыми словами рассуждений
        /^[-•*]?\s*(?:Actually|Wait|LEBEDEV|Krawtsov|Morozova).*$/gim,
        /^[-•*]?\s*(?=.*\b(qualifies?|experience|projects?|within|last \d+ years?)\b)(?=.*[A-Za-z]{20,}).*$/gim,
    ];

    for (const pattern of chainOfThoughtPatterns) {
        text = text.replace(pattern, '');
    }

    // === ФАЗА 2: Удаление многострочных блоков рассуждений ===

    // Удаляем блоки, начинающиеся с "- We" или подобного и продолжающиеся до следующего "-" или конца
    text = text.replace(/^[-•*]\s*(?:We|Let's|Let me|From|In document|Also|Thus|So|But|That|The|Actually|Wait|Need|I need)[^]*?(?=^[-•*]|\n\n|$)/gim, '');

    // === ФАЗА 3: Удаление inline английских фраз ===

    const inlinePatterns = [
        /\bProvide\s+(answer|source|citation|example|JSON|bullet)[^.]*\.?\s*/gi,
        /\bUse\s+(format|bullet|citation|short)[^.]*\.?\s*/gi,
        /\bCite\s+sources?[^.]*\.?\s*/gi,
        /\bThat answers the question[^.]*\.?\s*/gi,
        /\bSo\s+(?:he|she|it|they|we)\s+qualifies?[^.]*\.?\s*/gi,
    ];

    for (const pattern of inlinePatterns) {
        text = text.replace(pattern, '');
    }

    // === ФАЗА 4: Разбор по строкам и фильтрация ===

    const lines = text.split('\n');
    const filteredLines = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Пропускаем пустые строки (но сохраняем разделители)
        if (trimmed.length === 0) {
            if (filteredLines.length > 0 && filteredLines[filteredLines.length - 1] !== '') {
                filteredLines.push('');
            }
            continue;
        }

        // Пропускаем строки, которые явно являются рассуждениями
        const lowerLine = trimmed.toLowerCase();

        // Список признаков рассуждения (начало строки)
        const reasoningStarts = [
            'we need', 'we have', 'we found', 'we can', 'we should',
            'let\'s', 'let me', 'need to', 'i need',
            'from result', 'in document', 'in result', 'from the',
            'also ', 'thus ', 'so ', 'but ', 'that is', 'that answers',
            'the project', 'the document', 'the user', 'the question', 'the answer',
            'provide ', 'use format', 'use bullet', 'cite source',
            'not last', 'within last', 'last 3 year', 'last three',
            'actually', 'wait ', 'wait,',
            'he has', 'she has', 'they have', 'it has',
            'so qualifies', 'he qualifies', 'she qualifies',
        ];

        let isReasoning = false;
        for (const start of reasoningStarts) {
            // Проверяем начало строки (с учётом возможного маркера списка)
            const cleanLine = lowerLine.replace(/^[-•*]\s*/, '');
            if (cleanLine.startsWith(start)) {
                isReasoning = true;
                break;
            }
        }

        if (isReasoning) continue;

        // Проверяем соотношение кириллицы к латинице
        const cyrillicCount = (trimmed.match(/[А-Яа-яЁё]/g) || []).length;
        const latinCount = (trimmed.match(/[A-Za-z]/g) || []).length;
        const totalLetters = cyrillicCount + latinCount;

        // Если строка длинная и преимущественно на английском — пропускаем
        if (totalLetters > 30 && latinCount > cyrillicCount * 2) {
            continue;
        }

        // Если строка короткая и полностью на английском с ключевыми словами — пропускаем
        if (latinCount > 0 && cyrillicCount === 0 && totalLetters > 10) {
            const hasReasoningKeyword = /\b(need|result|document|answer|source|citation|provide|qualif|project|experience)\b/i.test(trimmed);
            if (hasReasoningKeyword) continue;
        }

        filteredLines.push(line);
    }

    text = filteredLines.join('\n');

    // === ФАЗА 5: Финальная очистка ===

    // Удаляем множественные пустые строки
    text = text.replace(/\n{3,}/g, '\n\n');

    // Удаляем пустые строки в начале и конце
    text = text.trim();

    // Удаляем висящие маркеры списка без содержимого
    text = text.replace(/^[-•*]\s*$/gm, '');

    // Ещё раз очищаем множественные пустые строки
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    // === ФАЗА 6: Проверка результата ===

    // Если текст пустой или нет русского текста
    if (!text || !/[А-Яа-яЁё]/.test(text)) {
        text = "К сожалению, релевантная информация не найдена в базе знаний.";
    }
}

return { json: { output: text } };
