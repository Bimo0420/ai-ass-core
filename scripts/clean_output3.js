//Оставляет больше информации 
let text = $input.item.json.output;

if (text && typeof text === 'string') {

    // === ФАЗА 0: Предобработка - удаление inline английских фраз БЕЗ удаления русского текста ===

    // Удаляем английские фразы-инструкции, сохраняя то, что идёт после них
    const inlineEnglishPatterns = [
        // "Provide source." или "Provide answer." в начале или середине строки
        /\bProvide\s+(answer|source|citation|example|JSON|bullet)[^А-Яа-яЁё]*?(?=[А-Яа-яЁё]|$)/gi,
        // "Use document" и подобное
        /\bUse\s+(document|format|bullet|citation|short)[^А-Яа-яЁё]*?(?=[А-Яа-яЁё]|$)/gi,
        // "Cite sources" в конце
        /\bCite\s+sources?\.?\s*$/gim,
        // "So answer:" и подобное
        /\bSo\s+answer:\s*/gi,
        /\bThus\s+answer:\s*/gi,
        // "Let's craft answer"
        /\bLet['']?s\s+craft\s+answer\.?\s*/gi,
        // "Based on the context/document"
        /\bBased on the (context|document|search results?)[,:.]?\s*/gi,
        // "According to the document"  
        /\bAccording to (the )?(document|search|context)[,:.]?\s*/gi,
        // Provide source в конце строки (без захвата русского текста)
        /\s*Provide source\.?\s*$/gim,
    ];

    for (const pattern of inlineEnglishPatterns) {
        text = text.replace(pattern, '');
    }

    // === ФАЗА 1: Функция определения chain-of-thought ===

    function isChainOfThought(fragment) {
        const lower = fragment.toLowerCase().trim();
        const trimmed = fragment.trim();

        if (trimmed.length < 3) return false;

        // Паттерны начала рассуждений (только если ВСЯ строка на английском)
        const cyrillicCount = (trimmed.match(/[А-Яа-яЁё]/g) || []).length;

        // Если есть кириллица — это НЕ рассуждение (важный контент)
        if (cyrillicCount > 0) return false;

        const reasoningStarts = [
            /^we (need|have|found|can|should|must)\b/i,
            /^let['']?s\b/i,
            /^let me\b/i,
            /^need to\b/i,
            /^i need\b/i,
            /^from (the )?results?\b/i,
            /^in (the )?(document|results?)\b/i,
            /^also ["'"]/i,
            /^thus\b/i,
            /^so (answer|experts?|he|she|they|it|we|qualifies?)\b/i,
            /^but (we|maybe|not|the)\b/i,
            /^that (is|answers?|would|was|'s)\b/i,
            /^the (project|document|user|question|answer|comfort)\b/i,
            /^actually\b/i,
            /^wait[,\s]/i,
            /^maybe\b/i,
            /^not last\b/i,
            /^within last\b/i,
            /^search results?\b/i,
            /^question:/i,
            /^task:/i,
        ];

        for (const pattern of reasoningStarts) {
            if (pattern.test(lower)) return true;
        }

        // Паттерны внутри текста для полностью английских фраз
        const latinCount = (trimmed.match(/[A-Za-z]/g) || []).length;

        if (latinCount > 15) {
            const reasoningPatterns = [
                /\bso qualifies\b/i,
                /\bhe (also )?has experience\b/i,
                /\bwithin last \d+ years?\b/i,
                /\bnot last \d+ years?\b/i,
                /\b\d{4}\s*Q[1-4]\b/i,
                /\bactually \d{4}\b/i,
                /\bqualifies for\b/i,
            ];

            for (const pattern of reasoningPatterns) {
                if (pattern.test(trimmed)) return true;
            }
        }

        return false;
    }

    // === ФАЗА 2: Удаление полных строк-рассуждений ===

    const fullLineRemovalPatterns = [
        /^[-•*]?\s*We need to answer:.*$/gim,
        /^[-•*]?\s*Question:.*$/gim,
        /^[-•*]?\s*Task:.*$/gim,
        // Строки полностью на английском с ключевыми словами
        /^[-•*]?\s*(?:We|Let's|Let me|Actually|Wait|Maybe|From the|In document|So he|So she|But we|That is|Search results)[^А-Яа-яЁё]*$/gim,
    ];

    for (const pattern of fullLineRemovalPatterns) {
        text = text.replace(pattern, '');
    }

    // === ФАЗА 3: Обработка строк с сохранением русского контента ===

    const lines = text.split('\n');
    const resultLines = [];

    for (let line of lines) {
        const trimmed = line.trim();

        // Пустые строки — добавляем как разделители
        if (trimmed.length === 0) {
            if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
                resultLines.push('');
            }
            continue;
        }

        // Проверяем наличие кириллицы в строке
        const hasCyrillic = /[А-Яа-яЁё]/.test(trimmed);

        if (hasCyrillic) {
            // Строка содержит русский текст — СОХРАНЯЕМ
            // Но удаляем английские "хвосты" и "головы"

            let cleaned = trimmed;

            // Удаляем английские префиксы перед русским текстом
            cleaned = cleaned.replace(/^[-•*]?\s*(?:We|Let's|Let me|From|In document|Also|Thus|So|But|That|The|Actually|Wait|Need|I need|Provide|Use|Cite)[^А-Яа-яЁё]*(?=[А-Яа-яЁё])/gi, '');

            // Удаляем английские суффиксы после русского текста (но не трогаем источники в скобках)
            cleaned = cleaned.replace(/(?<=[А-Яа-яЁё.!?»")\]])[\s,]*(?:Provide source|Cite sources?|Use document)\.?\s*$/gi, '');

            // Если после очистки остался контент с кириллицей — добавляем
            if (/[А-Яа-яЁё]/.test(cleaned) && cleaned.trim().length > 2) {
                resultLines.push(cleaned.trim());
            }
        } else {
            // Строка без кириллицы — проверяем, является ли она рассуждением
            if (!isChainOfThought(trimmed)) {
                // Может быть полезная строка (числа, формулы, короткие термины)
                // Но только если она короткая или содержит важные символы
                if (trimmed.length < 30 || /[%°≈≤≥→←]/.test(trimmed)) {
                    resultLines.push(trimmed);
                }
            }
            // Иначе пропускаем (это рассуждение)
        }
    }

    text = resultLines.join('\n');

    // === ФАЗА 4: Финальная очистка остаточных паттернов ===

    const residualPatterns = [
        /\s*\bProvide source\.?\s*/gi,
        /\s*\bUse document\b[^.]*\.?\s*/gi,
        /\s*\bCite sources?\.?\s*/gi,
        /\s*\bОтвет:\s*$/gim,
        /\s*\bSo answer:\s*/gi,
        /\s*Provide answer[^.]*\.?\s*/gi,
    ];

    for (const pattern of residualPatterns) {
        text = text.replace(pattern, ' ');
    }

    // === ФАЗА 5: Форматирование ===

    // Удаляем множественные пробелы
    text = text.replace(/  +/g, ' ');

    // Удаляем множественные пустые строки
    text = text.replace(/\n{3,}/g, '\n\n');

    // Удаляем висящие маркеры списка
    text = text.replace(/^[-•*]\s*$/gm, '');

    // Удаляем пустые строки в начале
    text = text.replace(/^\n+/, '');

    // Финальная очистка
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    // === ФАЗА 6: Проверка результата ===

    if (!text || !/[А-Яа-яЁё]/.test(text)) {
        text = "К сожалению, релевантная информация не найдена в базе знаний.";
    }
}

return { json: { output: text } };
