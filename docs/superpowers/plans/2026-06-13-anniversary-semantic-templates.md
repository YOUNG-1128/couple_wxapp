# Anniversary Semantic Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lightweight anniversary semantic templates, generate type-aware elapsed-time copy, and hide yearly repetition controls and labels.

**Architecture:** Normalize old and new anniversary type values in `utils/anniversary.js`, then decorate records with semantic labels and elapsed-time text. Keep persistence on the existing `type` and `repeatType` fields; new records default to yearly while old one-time records remain unchanged when edited.

**Tech Stack:** WeChat mini-program native Page/WXML/WXSS, CommonJS, Node.js built-in test runner.

---

### Task 1: Semantic type and elapsed-time rules

**Files:**
- Modify: `utils/anniversary.js`
- Modify: `tests/anniversaryLunar.test.js`

- [ ] Add failing tests for old type normalization, birthday copy, relationship copy, custom copy, and birthday occurrence suppression.
- [ ] Run `node --test tests/anniversaryLunar.test.js` and verify the new assertions fail.
- [ ] Add semantic type normalization and elapsed-day text generation.
- [ ] Decorate anniversaries with `semanticType`, `semanticLabel`, and `elapsedText`.
- [ ] Run the focused test and verify it passes.

### Task 2: Lightweight templates and hidden repeat controls

**Files:**
- Modify: `pages/anniversary/anniversary.js`
- Modify: `pages/anniversary/anniversary.wxml`
- Modify: `pages/anniversary/anniversary.wxss`
- Create: `tests/anniversarySemanticUi.test.js`

- [ ] Add a failing static regression test for a single birthday template and absence of repeat controls.
- [ ] Add template chips and template selection behavior.
- [ ] Make new records yearly while preserving the repeat type of edited records.
- [ ] Remove yearly labels from list cards and show semantic elapsed copy.
- [ ] Run focused UI tests.

### Task 3: Detail and persistence compatibility

**Files:**
- Modify: `pages/anniversary-detail/anniversary-detail.wxml`
- Modify: `services/anniversary.js`
- Modify: `cloudfunctions/upsertAnniversary/index.js`

- [ ] Remove the yearly label from detail and show semantic elapsed copy.
- [ ] Default missing new-record repeat values to yearly in client and cloud persistence.
- [ ] Preserve explicit `none` values for old records.
- [ ] Run syntax checks and focused anniversary tests.

### Task 4: Verification

**Files:**
- Verify all modified files.

- [ ] Run `node --test tests/*.test.js`.
- [ ] Run `node --check` for modified JavaScript files.
- [ ] Run `git diff --check` for the scoped changes.
