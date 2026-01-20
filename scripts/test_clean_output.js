// Тестовый скрипт для проверки clean_output.js
// Запуск: node test_clean_output.js

// Эмуляция $input для n8n
const testCases = [
    {
        name: "Case 7: Штрафы за тепловой контур",
        input: `We need to answer the question about fines. Let's check the document.
Provide answer citing document.md.Штраф за нарушение требований к тепловому контуру (например, отклонение размеров > 50 мм) составляет **1 % от суммы контракта**, тогда как за плохое качество отделки — **0,1 % от суммы контракта** (типовой договор с генеральным подрядчиком, document.md). Поэтому штраф за тепловой контур выше.`,
        expected: `Штраф за нарушение требований к тепловому контуру (например, отклонение размеров > 50 мм) составляет **1 % от суммы контракта**, тогда как за плохое качество отделки — **0,1 % от суммы контракта** (типовой договор с генеральным подрядчиком, document.md). Поэтому штраф за тепловой контур выше.`
    },
    {
        name: "Case 8: Доля себестоимости отделки",
        input: `From the search results, I can see the cost breakdown.
Provide source.Внутренняя отделка составляет ≈ 22 % от общей себестоимости проекта.
Источник: «Сметная калькуляция строительства объектов. Сравнительный анализ (2023–2024)»`,
        expected: `Внутренняя отделка составляет ≈ 22 % от общей себестоимости проекта.
Источник: «Сметная калькуляция строительства объектов. Сравнительный анализ (2023–2024)»`
    },
    {
        name: "Case 13: Коэффициент теплопередачи",
        input: `Let me check the requirements. We need to find the U-value.
Provide source.Коэффициент теплопередачи стен для здания класса «А» должен быть не выше 0,18 Вт/(м²·К).
Источник: СНиП 23-02-2003 и требования застройщика.`,
        expected: `Коэффициент теплопередачи стен для здания класса «А» должен быть не выше 0,18 Вт/(м²·К).
Источник: СНиП 23-02-2003 и требования застройщика.`
    },
    {
        name: "Case 16: Ламинат в пакете Комфорт",
        input: `From the document about finishing packages.
Provide source.В пакете «Комфорт» ламинат не используется — применяется линолеум.
Источник: описание отделочных пакетов.`,
        expected: `В пакете «Комфорт» ламинат не используется — применяется линолеум.
Источник: описание отделочных пакетов.`
    },
    {
        name: "Case 17: Глубина заложения фундамента",
        input: `The question is about foundation depth. Let's find the answer.
Based on the document.Глубина заложения фундамента составляет 1,9 м.
Источник: проектная документация.`,
        expected: `Глубина заложения фундамента составляет 1,9 м.
Источник: проектная документация.`
    },
    {
        name: "Смешанный текст с английскими рассуждениями",
        input: `We need to check experts. Actually, let me see.
- Иванов Иван Иванович — руководитель проекта
So he qualifies based on experience.
- Петров Пётр Петрович — главный инженер  
He has 5 years of experience, within last 3 years.
- Сидорова Анна Викторовна — архитектор
That's the answer.`,
        expected: `- Иванов Иван Иванович — руководитель проекта
- Петров Пётр Петрович — главный инженер
- Сидорова Анна Викторовна — архитектор`
    }
];

// Имитация функции из clean_output.js
function cleanOutput(inputText) {
    let text = inputText;

    if (text && typeof text === 'string') {

        // === ФАЗА 0: Предобработка - удаление inline английских фраз БЕЗ удаления русского текста ===

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

        // === ФАЗА 1: Функция определения chain-of-thought ===

        function isChainOfThought(fragment) {
            const lower = fragment.toLowerCase().trim();
            const trimmed = fragment.trim();

            if (trimmed.length < 3) return false;

            const cyrillicCount = (trimmed.match(/[А-Яа-яЁё]/g) || []).length;

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

            if (trimmed.length === 0) {
                if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
                    resultLines.push('');
                }
                continue;
            }

            const hasCyrillic = /[А-Яа-яЁё]/.test(trimmed);

            if (hasCyrillic) {
                let cleaned = trimmed;

                cleaned = cleaned.replace(/^[-•*]?\s*(?:We|Let's|Let me|From|In document|Also|Thus|So|But|That|The|Actually|Wait|Need|I need|Provide|Use|Cite)[^А-Яа-яЁё]*(?=[А-Яа-яЁё])/gi, '');

                cleaned = cleaned.replace(/(?<=[А-Яа-яЁё.!?»")\]])[\s,]*(?:Provide source|Cite sources?|Use document)\.?\s*$/gi, '');

                if (/[А-Яа-яЁё]/.test(cleaned) && cleaned.trim().length > 2) {
                    resultLines.push(cleaned.trim());
                }
            } else {
                if (!isChainOfThought(trimmed)) {
                    if (trimmed.length < 30 || /[%°≈≤≥→←]/.test(trimmed)) {
                        resultLines.push(trimmed);
                    }
                }
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

        text = text.replace(/  +/g, ' ');
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.replace(/^[-•*]\s*$/gm, '');
        text = text.replace(/^\n+/, '');
        text = text.replace(/\n{3,}/g, '\n\n').trim();

        // === ФАЗА 6: Проверка результата ===

        if (!text || !/[А-Яа-яЁё]/.test(text)) {
            text = "К сожалению, релевантная информация не найдена в базе знаний.";
        }
    }

    return text;
}

// Запуск тестов
console.log("=".repeat(80));
console.log("ТЕСТИРОВАНИЕ СКРИПТА ОЧИСТКИ ВЫВОДА LLM");
console.log("=".repeat(80));

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
    console.log("\n" + "-".repeat(80));
    console.log(`TEST: ${testCase.name}`);
    console.log("-".repeat(80));

    const result = cleanOutput(testCase.input);
    const normalizedResult = result.replace(/\s+/g, ' ').trim();
    const normalizedExpected = testCase.expected.replace(/\s+/g, ' ').trim();

    const isPass = normalizedResult === normalizedExpected;

    console.log("\n📥 INPUT:");
    console.log(testCase.input.substring(0, 200) + (testCase.input.length > 200 ? "..." : ""));

    console.log("\n📤 OUTPUT:");
    console.log(result);

    console.log("\n✅ EXPECTED:");
    console.log(testCase.expected);

    if (isPass) {
        console.log("\n🎉 STATUS: PASSED");
        passed++;
    } else {
        console.log("\n❌ STATUS: FAILED");
        console.log("\n🔍 DIFF:");
        console.log("Got:      ", normalizedResult.substring(0, 100));
        console.log("Expected: ", normalizedExpected.substring(0, 100));
        failed++;
    }
}

console.log("\n" + "=".repeat(80));
console.log(`ИТОГО: ${passed} passed, ${failed} failed из ${testCases.length} тестов`);
console.log("=".repeat(80));
