const displayEl = document.getElementById("display");
const expressionEl = document.getElementById("expression");
const keysEl = document.getElementById("keys");

const OP_SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷" };

function formatDisplay(value) {
  if (value === "Error") return "오류";
  if (value === "-" || value === "." || value === "-.") return value;
  if (!Number.isFinite(Number(value))) return "오류";
  const n = Number(value);
  if (Object.is(n, -0)) return "-0";
  const s = String(value);
  if (s.length > 14) {
    const exp = n.toExponential(6);
    return exp.length < s.length ? exp : s.slice(0, 14);
  }
  return s;
}

function createState() {
  return {
    display: "0",
    expression: "",
    prev: null,
    op: null,
    fresh: true,
  };
}

let state = createState();

function render() {
  displayEl.textContent = formatDisplay(state.display);
  expressionEl.textContent = state.expression;
}

function displayToNumber() {
  const d = state.display;
  if (d === "-" || d === "." || d === "-.") return 0;
  const n = Number(d);
  return Number.isFinite(n) ? n : 0;
}

function inputDigit(d) {
  if (state.expression.includes("=")) state.expression = "";
  if (state.fresh || state.display === "Error") {
    state.display = d;
    state.fresh = false;
  } else if (state.display === "0" && d !== "0") {
    state.display = d;
  } else if (state.display === "-0") {
    state.display = d === "0" ? "-0" : `-${d}`;
  } else if (state.display.replace("-", "").replace(".", "").length < 14) {
    state.display += d;
  }
}

function inputDecimal() {
  if (state.expression.includes("=")) state.expression = "";
  if (state.fresh || state.display === "Error") {
    state.display = "0.";
    state.fresh = false;
    return;
  }
  if (!state.display.includes(".")) state.display += ".";
}

function applyOp(a, b, op) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

function commitPending() {
  if (state.prev === null || state.op === null) return displayToNumber();
  const next = displayToNumber();
  const result = applyOp(state.prev, next, state.op);
  return result;
}

function setOperator(op) {
  const current = displayToNumber();
  if (state.display === "Error") return;

  if (state.prev !== null && state.op !== null && !state.fresh) {
    const r = commitPending();
    if (!Number.isFinite(r)) {
      state.display = "Error";
      state.expression = "";
      state.prev = null;
      state.op = null;
      state.fresh = true;
      return;
    }
    state.prev = r;
    state.display = formatNumberForStore(r);
  } else {
    state.prev = current;
  }

  state.op = op;
  state.expression = `${trimDisplay(state.display)} ${OP_SYMBOL[op]}`;
  state.fresh = true;
}

function trimDisplay(s) {
  if (s.endsWith(".") && s !== "-") return s.slice(0, -1);
  return s;
}

function formatNumberForStore(n) {
  const str = String(n);
  if (str.includes("e")) return str;
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  return str;
}

function equals() {
  if (state.op === null || state.prev === null) return;
  const sym = OP_SYMBOL[state.op];
  state.expression = `${trimDisplay(String(state.prev))} ${sym} ${trimDisplay(state.display)} =`;
  const r = commitPending();
  if (!Number.isFinite(r)) {
    state.display = "Error";
  } else {
    state.display = formatNumberForStore(r);
  }
  state.prev = null;
  state.op = null;
  state.fresh = true;
}

function clearAll() {
  state = createState();
}

function backspace() {
  if (state.fresh || state.display === "Error") return;
  if (state.display.length <= 1) {
    state.display = "0";
    state.fresh = true;
    return;
  }
  state.display = state.display.slice(0, -1);
}

function percent() {
  if (state.display === "Error") return;
  const n = Number(state.display) / 100;
  state.display = formatNumberForStore(n);
  state.fresh = true;
}

function toggleSign() {
  if (state.display === "Error") return;
  if (state.display === "0") {
    state.display = "-0";
    state.fresh = false;
    return;
  }
  if (state.display === "-0") {
    state.display = "0";
    state.fresh = true;
    return;
  }
  if (state.display === "0.") {
    state.display = "-0.";
    state.fresh = false;
    return;
  }
  if (state.display === "-0.") {
    state.display = "0.";
    state.fresh = false;
    return;
  }
  if (state.display.startsWith("-")) state.display = state.display.slice(1);
  else state.display = `-${state.display}`;
  state.fresh = false;
}

function onKeyDown(e) {
  if (e.key >= "0" && e.key <= "9") {
    e.preventDefault();
    inputDigit(e.key);
    render();
    return;
  }
  if (e.key === ".") {
    e.preventDefault();
    inputDecimal();
    render();
    return;
  }
  if (e.key === "+" || e.key === "-") {
    e.preventDefault();
    if (e.key === "-" && state.display === "0" && state.fresh) {
      state.display = "-";
      state.fresh = false;
      render();
      return;
    }
    setOperator(e.key);
    render();
    return;
  }
  if (e.key === "*") {
    e.preventDefault();
    setOperator("*");
    render();
    return;
  }
  if (e.key === "/") {
    e.preventDefault();
    setOperator("/");
    render();
    return;
  }
  if (e.key === "Enter" || e.key === "=") {
    e.preventDefault();
    equals();
    render();
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    clearAll();
    render();
    return;
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    backspace();
    render();
    return;
  }
  if (e.key === "%") {
    e.preventDefault();
    percent();
    render();
    return;
  }
}

keysEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  switch (action) {
    case "digit":
      inputDigit(btn.dataset.value);
      break;
    case "decimal":
      inputDecimal();
      break;
    case "operator":
      setOperator(btn.dataset.value);
      break;
    case "equals":
      equals();
      break;
    case "clear":
      clearAll();
      break;
    case "delete":
      backspace();
      break;
    case "sign":
      toggleSign();
      break;
    default:
      break;
  }
  render();
});

document.addEventListener("keydown", onKeyDown);
render();
