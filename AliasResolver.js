/**
 * AliasResolver.js — index2-style preprocessor before assembly.
 * 1) #DEF: collect, remove #DEF lines, replace aliases (word-boundary, case-insensitive).
 * 2) Strip -- and ; comments, drop empty lines.
 * 3) Expand "label: instruction" into two lines so original index assembler gets "label:\ninstruction".
 * Then the original assembler.js runs unchanged on the result.
 */
(function () {
    const defLineRegex = /^\s*#DEF\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*;?\s*$/i;

    function escapeRegExp(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    /**
     * Same logic as index2 processAsm, then split "label: instruction" into two lines
     * so original index assembler (label-only line, then instruction line) works.
     * @param {string} asmText - Raw ASM source.
     * @returns {string} - Preprocessed ASM for original assemble().
     */
    function resolveAliases(asmText) {
        if (typeof asmText !== "string") return "";

        const lines = asmText.split(/\r?\n/);

        // 1) Collect #DEFs (case-insensitive keys)
        const defs = Object.create(null);
        for (const line of lines) {
            const m = defLineRegex.exec(line);
            if (m) {
                const name = m[1].toLowerCase();
                const value = m[2].trim();
                defs[name] = value;
            }
        }

        // 2) Remove #DEF lines
        const nonDefLines = lines.filter(l => !defLineRegex.test(l));

        // 3) Strip comments: -- and ; to end of line
        const stripped = nonDefLines.map(line =>
            line
                .replace(/--.*$/g, "")
                .replace(/;.*$/g, "")
        );

        // 4) Trim and drop empty lines
        const cleaned = stripped.map(l => l.replace(/\s+$/g, "").trim()).filter(l => l.length > 0);

        // 5) Replace aliases (word-boundary, longest first)
        const keys = Object.keys(defs).sort((a, b) => b.length - a.length);
        const replaced = cleaned.map(originalLine => {
            let line = originalLine;
            for (const key of keys) {
                const re = new RegExp("\\b" + escapeRegExp(key) + "\\b", "gi");
                line = line.replace(re, defs[key]);
            }
            return line.trimEnd();
        });

        // 6) Expand "label: instruction" into two lines for original assembler
        const out = [];
        for (const line of replaced) {
            const colonIdx = line.indexOf(":");
            if (colonIdx !== -1) {
                const label = line.slice(0, colonIdx).trim();
                const rest = line.slice(colonIdx + 1).trim();
                if (label.length > 0) {
                    out.push(label + ":");
                }
                if (rest.length > 0) {
                    out.push(rest);
                }
            } else {
                out.push(line);
            }
        }

        return out.join("\n");
    }

    /**
     * Same as resolveAliases but also returns a lineMap so callers can trace
     * each output line back to its original source line index.
     *
     * @param {string} asmText - Raw ASM source.
     * @returns {{ resolved: string, lineMap: number[] }}
     *   resolved  — preprocessed ASM string ready for assemble()
     *   lineMap   — lineMap[outLineIdx] = 0-based index in the original asmText lines
     */
    function resolveAliasesWithMap(asmText) {
        if (typeof asmText !== "string") return { resolved: "", lineMap: [] };

        const lines = asmText.split(/\r?\n/);

        // Collect #DEFs
        const defs = Object.create(null);
        for (const line of lines) {
            const m = defLineRegex.exec(line);
            if (m) defs[m[1].toLowerCase()] = m[2].trim();
        }

        const keys = Object.keys(defs).sort((a, b) => b.length - a.length);
        const out     = [];  // output lines for assemble()
        const lineMap = [];  // lineMap[outIdx] = origIdx

        lines.forEach((rawLine, origIdx) => {
            // Skip #DEF lines
            if (defLineRegex.test(rawLine)) return;

            // Strip comments
            let line = rawLine
                .replace(/--.*$/g, "")
                .replace(/;.*$/g, "")
                .trim();

            // Drop empty
            if (!line) return;

            // Expand aliases
            for (const key of keys) {
                const re = new RegExp("\\b" + escapeRegExp(key) + "\\b", "gi");
                line = line.replace(re, defs[key]);
            }
            line = line.trimEnd();

            // Split "label: instruction" into two lines
            const colonIdx = line.indexOf(":");
            if (colonIdx !== -1) {
                const label = line.slice(0, colonIdx).trim();
                const rest  = line.slice(colonIdx + 1).trim();
                if (label.length > 0) { out.push(label + ":"); lineMap.push(origIdx); }
                if (rest.length  > 0) { out.push(rest);        lineMap.push(origIdx); }
            } else {
                out.push(line);
                lineMap.push(origIdx);
            }
        });

        return { resolved: out.join("\n"), lineMap };
    }

    /**
     * Like resolveAliases but PRESERVES comments, blank lines, and code structure.
     * Only #DEF definition lines are removed; every other line keeps its comments.
     * Alias names are expanded only in the non-comment portion of each line.
     *
     * This is used by the "De-alias Code" tab so users can see their program
     * with alias names replaced by real instructions while retaining readability.
     *
     * @param {string} asmText - Raw ASM source.
     * @returns {string} - Same source with #DEF lines removed and aliases expanded.
     */
    function resolveAliasesForDisplay(asmText) {
        if (typeof asmText !== "string") return "";

        const lines = asmText.split(/\r?\n/);

        // 1) Collect #DEFs
        const defs = Object.create(null);
        for (const line of lines) {
            const m = defLineRegex.exec(line);
            if (m) defs[m[1].toLowerCase()] = m[2].trim();
        }

        const keys = Object.keys(defs).sort((a, b) => b.length - a.length);
        const out = [];

        for (const rawLine of lines) {
            // Drop #DEF lines (they are definitions, not instructions)
            if (defLineRegex.test(rawLine)) continue;

            // Preserve blank lines as-is
            if (!rawLine.trim()) {
                out.push(rawLine);
                continue;
            }

            // Split "code -- comment" first (-- comment style)
            let codePart = rawLine;
            let trailingComment = "";
            const dashIdx = rawLine.indexOf("--");
            if (dashIdx !== -1) {
                codePart        = rawLine.slice(0, dashIdx);
                trailingComment = rawLine.slice(dashIdx);
            }

            // Then split "code ; comment" (semicolon style) — only in the code portion
            const semiIdx = codePart.indexOf(";");
            if (semiIdx !== -1) {
                trailingComment = codePart.slice(semiIdx) + trailingComment;
                codePart        = codePart.slice(0, semiIdx);
            }

            // Expand aliases only in the instruction portion
            for (const key of keys) {
                const re = new RegExp("\\b" + escapeRegExp(key) + "\\b", "gi");
                codePart = codePart.replace(re, defs[key]);
            }

            out.push(codePart + trailingComment);
        }

        return out.join("\n");
    }

    window.resolveAliases           = resolveAliases;
    window.resolveAliasesWithMap    = resolveAliasesWithMap;
    window.resolveAliasesForDisplay = resolveAliasesForDisplay;
})();
