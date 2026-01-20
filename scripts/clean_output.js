// с дефектами
// let text = $input.item.json.output;

if (text && typeof text === 'string') {

    // === ФАЗА -1: Удаление вопроса пользователя из начала (если попал в output) ===

    // Удаляем вопрос в начале: "Какой-то вопрос?" + английский текст после
    text = text.replace(/^[А-Яа-яЁё][^?!]*[?!][""]?\s*(?:Use |The |From |We |Let |I )[^А-Яа-яЁё]*(?=[А-Яа-яЁё*#\-•|]|$)/i, '');

    // Удаляем "Use relevant documents: ..." целиком
    text = text.replace(/\bUse relevant documents?:[^А-Яа-яЁё]*(?:shows? cases?:?[^А-Яа-яЁё]*)?(?=[А-Яа-яЁё*#\-•|]|$)/gi, '');

    // Удаляем "shows cases: арматура, бетон..." если это часть английского предложения
    text = text.replace(/\bshows? cases?:\s*[а-яё,\s]+\./gi, '');

    // Удаляем висячие названия документов в кавычках
    text = text.replace(/^["«»"'][^"«»"']+["«»"']\s*$/gm, '');

    // === ФАЗА 0: Удаление очевидных Chain-of-Thought блоков на английском ===

    // Удаляем целые предложения/фразы на английском которые явно являются рассуждениями
    const englishReasoningPatterns = [
        // Предложения начинающиеся с типичных CoT маркеров
        /\b(?:We need to|We might need|We can say|We should|Let me|Let's|I need to|I should|I can)\b[^.!?]*[.!?]/gi,
        /\b(?:But we need|But I need|However,? we|However,? I)\b[^.!?]*[.!?]/gi,
        /\b(?:That indicates?|That shows?|This indicates?|This shows?)\b[^.!?]*[.!?]/gi,
        /\b(?:Also mention|Also note|Also we|Also I)\b[^.!?]*[.!?]/gi,
        /\b(?:Provide evidence|Provide source|Provide answer)\b[^.!?]*[.!?]?/gi,
        /\b(?:The documents? shows?|The results? shows?)\b[^.!?]*[.!?]/gi,
        // Сравнительные рассуждения
        /\b(?:Both,? but|Either way|In any case)\b[^.!?]*[.!?]/gi,
        // Технические рассуждения о поиске
        /\b(?:not directly given|not mentioned|no direct)\b[^.!?]*[.!?]/gi,
        // Use relevant documents
        /\bUse relevant\b[^.!?]*[.!?]?/gi,
    ];

    for (const pattern of englishReasoningPatterns) {
        text = text.replace(pattern, ' ');
    }

    // === ФАЗА 1: Удаление inline английских инструкций ===

    const inlineEnglishPatterns = [
        /\bProvide\s+(answer|source|citation|example|JSON|bullet)[^А-Яа-яЁё]*?(?=[А-Яа-яЁё]|$)/gi,
        /\bUse\s+(document|format|bullet|citation|short)[^А-Яа-яЁё]*?(?=[А-Яа-яЁё]|$)/gi,
        /\bCite\s+sources?\.?\s*$/gim,
        /\bSo\s+answer:\s*/gi,
        /\bThus\s+answer:\s*/gi,
        /\bLet['']?s\s+craft\s+answer\.?\s*/gi,
        /\bBased on the (context|document|search results?)[,:.]?\s*/gi,
        /\bAccording to (the )?(document|search|context)[,:.]?\s*/gi,
        /\s*Provide source\.?\s*$/gim,
    ];

    for (const pattern of inlineEnglishPatterns) {
        text = text.replace(pattern, '');
    }

    // === ФАЗА 2: Анализ и фильтрация по предложениям ===

    function isEnglishReasoning(sentence) {
        const trimmed = sentence.trim();
        if (trimmed.length < 5) return false;

        // Подсчёт символов
        const cyrillicCount = (trimmed.match(/[А-Яа-яЁё]/g) || []).length;
        const latinCount = (trimmed.match(/[A-Za-z]/g) || []).length;
        const totalLetters = cyrillicCount + latinCount;

        if (totalLetters < 5) return false;

        // Если преимущественно на английском (латиницы > 60%) — проверяем на рассуждения
        if (latinCount > totalLetters * 0.6) {
            const reasoningKeywords = [
                /\b(we need|we can|we should|we might|let me|let's|i need|i should)\b/i,
                /\b(but |however|also |that is|this is|indicates?|shows?)\b/i,
                /\b(provide|both|either|probably|maybe|perhaps)\b/i,
                /\b(documents?|results?|answer|evidence|compare|typical)\b/i,
                /\b(not directly|not mentioned|larger share|significant)\b/i,
                /\b(can be|could be|would be|might be|has bigger)\b/i,
            ];

            for (const pattern of reasoningKeywords) {
                if (pattern.test(trimmed)) return true;
            }

            // Если >80% латиница и длинное — скорее всего рассуждение
            if (latinCount > totalLetters * 0.8 && trimmed.length > 30) {
                return true;
            }
        }

        return false;
    }

    // Разбиваем на предложения и фильтруем
    // Используем разделители: точка+пробел, восклицательный, вопросительный, перенос строки
    const sentences = text.split(/(?<=[.!?])\s+|\n+/);
    const goodSentences = [];

    for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;

        // Пропускаем английские рассуждения
        if (isEnglishReasoning(trimmed)) continue;

        // Проверяем наличие кириллицы
        const hasCyrillic = /[А-Яа-яЁё]/.test(trimmed);

        if (hasCyrillic) {
            // Очищаем от английских вкраплений в начале/конце
            let cleaned = trimmed;

            // Удаляем английское начало перед русским текстом
            cleaned = cleaned.replace(/^[A-Za-z][^А-Яа-яЁё]*(?=[А-Яа-яЁё])/g, '');

            // Удаляем английский хвост после русского (если нет важных символов)
            cleaned = cleaned.replace(/(?<=[А-Яа-яЁё.!?»"):\d])\s+[A-Za-z][^А-Яа-яЁё]*$/g, '');

            if (cleaned.trim().length > 2) {
                goodSentences.push(cleaned.trim());
            }
        } else {
            // Чисто латинский текст — сохраняем только короткие технические фрагменты
            if (trimmed.length < 20 && /[\d%°≈≤≥]/.test(trimmed)) {
                goodSentences.push(trimmed);
            }
        }
    }

    text = goodSentences.join('\n');

    // === ФАЗА 3: Удаление полных строк-рассуждений ===

    const fullLineRemovalPatterns = [
        /^[-•*]?\s*We need to answer:.*$/gim,
        /^[-•*]?\s*Question:.*$/gim,
        /^[-•*]?\s*Task:.*$/gim,
        /^[-•*]?\s*(?:We|Let's|Let me|Actually|Wait|Maybe|From the|In document|So he|So she|But we|That is|Search results)[^А-Яа-яЁё]*$/gim,
    ];

    for (const pattern of fullLineRemovalPatterns) {
        text = text.replace(pattern, '');
    }

    // === ФАЗА 4: Финальная очистка ===

    const residualPatterns = [
        /\s*\bProvide source\.?\s*/gi,
        /\s*\bUse document\b[^.]*\.?\s*/gi,
        /\s*\bCite sources?\.?\s*/gi,
        /\s*\bSo answer:\s*/gi,
        /\s*Provide answer[^.]*\.?\s*/gi,
        // Очистка хвостов типа "Also mention of 30%..."
        /\s*\bAlso\s+\w+\s+of\s+[^А-Яа-яЁё]+$/gim,
    ];

    for (const pattern of residualPatterns) {
        text = text.replace(pattern, ' ');
    }

    // === ФАЗА 5: Форматирование ===

    // Соединяем предложения в абзацы
    const lines = text.split('\n').filter(l => l.trim());
    const formattedLines = [];
    let currentParagraph = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Если начинается с маркера списка или заглавной буквы — новый пункт
        if (/^[-•*—]/.test(trimmed) ||
            (/^[А-ЯЁ\d**]/.test(trimmed) && currentParagraph.length > 0 && !/[,;]$/.test(currentParagraph[currentParagraph.length - 1]))) {
            if (currentParagraph.length > 0) {
                formattedLines.push(currentParagraph.join(' '));
                currentParagraph = [];
            }
        }

        currentParagraph.push(trimmed);
    }

    if (currentParagraph.length > 0) {
        formattedLines.push(currentParagraph.join(' '));
    }

    text = formattedLines.join('\n\n');

    // Удаляем множественные пробелы
    text = text.replace(/  +/g, ' ');

    // Удаляем множественные пустые строки
    text = text.replace(/\n{3,}/g, '\n\n');

    // Удаляем висящие маркеры списка
    text = text.replace(/^[-•*]\s*$/gm, '');

    // Финальная очистка
    text = text.trim();

    // === ФАЗА 6: Проверка результата ===

    if (!text || !/[А-Яа-яЁё]/.test(text)) {
        text = "К сожалению, релевантная информация не найдена в базе знаний.";
    }
}

return { json: { output: text } };
