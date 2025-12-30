import { getMousePosition, updateSvgPath } from "./position.js";

// 시작전(이미지 로드 전), 이미지 로드 후, 텍스트 박스 찍기, 텍스트 입력 중, 라인 그리기 시작, 라인 그리는 중
const _DEFAULTSTATE = null;
const _TEXTSTATE = 0;
const _LINESTATE = 1;
const _DRAWINGSTATE = 2;
const _TYPINGSTATE = 3;
const _READYSTATE = -1;

export default class ImageMemo {
  // 기본 option
  #rootId;
  #options;
  // data 관련
  #memos = [];
  #paths = [];

  // 모르겠음
  #ids = [];

  // UI 상태 관련
  #focus = null;
  #state = _DEFAULTSTATE;

  // init data 관련
  #data = null;

  // timeline 관련
  #prevState = [];
  #nextState = [];

  constructor(rootId, opt = {}) {
    this.#rootId = rootId;
    this.#options = opt;
    this.#memos = [];
    this.#ids = [];
    this.#focus = null;

    this.#render();

    window.addEventListener("click", (e) => {
      this.#onResetFocus(e);
    });

    window.addEventListener("keypress", (e) => this.#onShortcutEvent(e));

    window.addEventListener("keydown", (e) => {
      console.log("extra Key", e);
      if (e.code === "Escape") {
        this.#onResetFocus(e);
      } else if (e.code === "Delete") {
        if (this.#focus) {
          // TODO: 텍스트 입력중 바로 삭제해버림. 입력중 상태라도 필요할 듯
          document.getElementById(this.#focus).remove();
          this.#focus = null;
        }
      }
    });

    // window.addEventListener("keyup", (e) => {
    //   e.stopPropagation();
    //   e.preventDefault();
    //   e.stopImmediatePropagation();
    //   console.log("keyup", e);
    // });
  }

  setData(data) {
    this.#data = data;
  }

  add(data) {
    if (!data) return;
    const { MEMOS: memos, PATHS: paths } = data;
    console.log(memos, paths);

    memos.forEach((m) => {
      const memo = this.#createMemo(m.innerHTML, {
        x: m.left,
        y: m.top,
      });
      const canvasEl = document.getElementById(this.#rootId + "_canvas");
      canvasEl.appendChild(memo);
    });

    paths.forEach((p) => {
      const { id, fill, stroke, strokeWidth, startX, startY, endX, endY, d } =
        p;

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("id", id);
      path.setAttribute("fill", fill);
      path.setAttribute("stroke", stroke);
      path.setAttribute("stroke-width", strokeWidth);
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("d", d);

      path.dataset.startX = startX;
      path.dataset.startY = startY;
      path.dataset.endX = endX;
      path.dataset.endY = endY;

      const canvasEl = document.getElementById(this.#rootId + "_paint");
      canvasEl.appendChild(path);
    });
  }

  destroy() {
    window.removeEventListener("click", this.#onResetFocus);
    window.removeEventListener("keypress", this.#onShortcutEvent);
  }

  #onResetFocus(e) {
    console.log("onResetFocus ", e);
    const element = e.target;

    if (this.#state !== _DEFAULTSTATE) return;

    if (
      element.nodeName === "ARTICLE" ||
      (element.nodeName === "INPUT" && element.type === "color")
    ) {
      return;
    }

    this.#memos.forEach((memo) => {
      memo.classList.remove("focus");
      memo.querySelector("div").blur();
    });

    this.#paths.forEach((path) => {
      path.classList.remove("focus");
    });

    this.#focus = null;
  }

  #onShortcutEvent(e) {
    console.log(this.#focus, "onShortcut ", e);
    if (this.#focus !== null) return;

    if (e.ctrlKey && e.code === "KeyZ") {
      console.log("실행 취소 - Undo");
    }
    if (e.ctrlKey && e.code === "KeyY") {
      console.log("되돌리기");
    }

    if (e.code === "KeyL") {
      console.log("라인 그리기");
      const addLineBtnEl = document.getElementById(this.#rootId + "_line_btn");
      addLineBtnEl.click();
    }
    if (e.code === "KeyT") {
      console.log("TextArea 그리기");
      const addTextAreaBtnEl = document.getElementById(
        this.#rootId + "_textArea_btn"
      );
      addTextAreaBtnEl.click();
    }
  }

  #render() {
    const root = document.getElementById(this.#rootId);

    const toolbar = this.#renderToolbar();
    const content = this.#renderContent();

    root.appendChild(toolbar);
    root.appendChild(content);
  }

  #renderToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    const fileEl = document.createElement("input");
    fileEl.type = "file";
    fileEl.addEventListener("change", (e) => {
      const imgEl = document.getElementById(this.#rootId + "_image");
      const uploadFile = e.target.files;
      if (!uploadFile || uploadFile?.length === 0) {
        imgEl.src = "";
        return;
      }

      const base64 = new Blob([uploadFile[0]], { type: uploadFile[0].type });

      const url = window.URL.createObjectURL(base64);

      if (imgEl) imgEl.src = url;
    });

    const saveEl = document.createElement("button");
    saveEl.textContent = "SAVE";
    saveEl.addEventListener("click", (e) => {
      const memos = this.#memos.map((memo) => {
        const {
          innerHTML,
          style: { top, left, backgroundColor, color },
          offsetLeft,
          offsetTop,
          id,
        } = memo;
        return {
          innerHTML,
          offsetLeft,
          offsetTop,
          backgroundColor,
          color,
          id,
        };
      });

      const lines = this.#paths.map((path) => {
        const {
          attributes: {
            id: { value: id },
            fill: { value: fill },
            stroke: { value: stroke },
            "stroke-width": { value: strokeWidth },
            d: { value: d },
          },
          dataset: { startX, startY, endX, endY },
        } = path;

        return {
          id,
          fill,
          stroke,
          strokeWidth,
          startX,
          startY,
          endX,
          endY,
          d,
        };
      });

      console.log("memos :: ", memos);
      console.log("lines :: ", lines);
    });

    const addTextAreaBtnEl = document.createElement("button");
    addTextAreaBtnEl.id = this.#rootId + "_textArea_btn";
    addTextAreaBtnEl.textContent = "[ T ]";
    addTextAreaBtnEl.addEventListener("click", (e) => {
      this.#textStateEnabled();
      this.#lineStateEnabled();

      this.#state = _TEXTSTATE;
      this.#textStateDisabled();

      // const memo = this.#createMemo();
      // const canvasEl = document.getElementById(this.#rootId + "_canvas");
      // canvasEl.appendChild(memo);
    });

    const addLineBtnEl = document.createElement("button");
    addLineBtnEl.id = this.#rootId + "_line_btn";
    addLineBtnEl.textContent = "[ L ]";
    addLineBtnEl.addEventListener("click", (e) => {
      this.#state = _LINESTATE;
      this.#lineStateDisabled();
    });

    toolbar.appendChild(fileEl);
    toolbar.appendChild(saveEl);
    toolbar.appendChild(addTextAreaBtnEl);
    toolbar.appendChild(addLineBtnEl);

    return toolbar;
  }

  #createMemo(text = null, { x = 0, y = 0 }) {
    const uuidStr = window.crypto
      .getRandomValues(new Uint32Array(1))[0]
      .toString(36);

    const memoId = this.#rootId + "_memo_" + uuidStr;

    const memo = document.createElement("article");
    memo.draggable = true;
    memo.id = memoId;
    memo.className = "memo";
    memo.dataset.anchor = "--" + this.#rootId + "-image";
    memo.style.top = (text === null ? y - 15 : y) + "px";
    memo.style.left = (text === null ? x - 50 : x) + "px";

    memo.addEventListener("dragstart", (e) => {
      const {
        layerX,
        layerY,
        target: { clientWidth, clientHeight },
      } = e;

      // e.currentTarget.classList.add(styles.drag_start);
      e.currentTarget.setAttribute("layerX", String(layerX));
      e.currentTarget.setAttribute("layerY", String(layerY));
      // e.currentTarget.style.setProperty("transform", "translate(0, 0)");
    });
    memo.addEventListener("dragend", (e) => {
      const { clientX, clientY } = e;
      // const { clientWidth, clientHeight } = e.currentTarget;
      const { scrollTop, scrollLeft } = e.target.parentElement;
      const { top, left } = e.target.parentElement.getBoundingClientRect();

      const layerX = e.currentTarget.getAttribute("layerX");
      const layerY = e.currentTarget.getAttribute("layerY");

      const positionX = clientX - Number(layerX) - left + scrollLeft;
      const positionY = clientY - Number(layerY) - top + scrollTop;

      // if (positionX < 0) positionX = 0;
      // if (positionY < 0) positionY = 0;

      // if (positionX + clientWidth > innerWidth)
      //   positionX = innerWidth - clientWidth;
      // if (positionY + clientHeight > innerHeight)
      //   positionY = innerHeight - clientHeight;

      e.currentTarget.style.top = positionY + "px";
      e.currentTarget.style.left = positionX + "px";
    });
    memo.addEventListener("dragover", (e) => e.preventDefault());
    memo.addEventListener("click", (e) => {
      this.#memos.forEach((memo) => memo.classList.remove("focus"));

      memo.classList.add("focus");
      this.#focus = memoId;
    });
    const textArea = document.createElement("div");
    textArea.contentEditable = true;
    textArea.innerHTML = text;
    textArea.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("text area clicked", memoId);
      memo.classList.add("focus");
      this.#focus = memoId;
    });

    textArea.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        textArea.blur();
        memo.classList.remove("focus");
        this.#focus = null;
      }
    });

    memo.appendChild(textArea);
    // memo.contentEditable = true;

    this.#memos.push(memo);
    this.#ids.push(memoId);
    return memo;
  }

  #createPath(e, { fill = "none", stroke = "blue", strokeWidth = 3 }) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const uuidStr = window.crypto
      .getRandomValues(new Uint32Array(1))[0]
      .toString(36);

    const pathId = this.#rootId + "_path_" + uuidStr;

    // TODO: Option 처리
    path.setAttribute("id", pathId);
    path.setAttribute("fill", fill);
    path.setAttribute("stroke", stroke);
    path.setAttribute("stroke-width", strokeWidth);
    path.setAttribute("stroke-linejoin", "round");
    path.classList.add("path");
    path.addEventListener("click", (e) => {
      this.#focus = pathId;
      this.#paths.forEach((path) => path.classList.remove("focus"));
      path.classList.add("focus");
    });
    var pt = getMousePosition(e, this.#rootId + "_paint");

    path.dataset.startX = pt.x;
    path.dataset.startY = pt.y;

    // appendToBuffer(pt);
    // path.setAttribute("d", strPath);

    const canvasEl = document.getElementById(this.#rootId + "_paint");
    canvasEl.appendChild(path);

    this.#state = _DRAWINGSTATE;
    this.#focus = pathId;
    this.#paths.push(path);

    return path;
  }

  #renderContent() {
    const content = document.createElement("div");
    content.className = "memo_content";
    content.addEventListener("click", (e) => {
      this.#onResetFocus(e);
    });

    // content.addEventListener("keypress", (e) => this.#onShortcutEvent(e));

    // content.addEventListener("keydown", (e) => {
    //   if (e.code === "Escape") {
    //     this.#onResetFocus(e);
    //   }
    // });

    const canvas = document.createElement("div");
    canvas.className = "image_wrapper";
    canvas.id = this.#rootId + "_canvas";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = this.#rootId + "_paint";
    svg.setAttribute("class", "image_paint");
    svg.setAttribute("target-anchor", "--" + this.#rootId + "-image");

    const image = document.createElement("img");
    image.style.anchorName = "--" + this.#rootId + "-image";
    image.id = this.#rootId + "_image";
    image.addEventListener("load", (e) => {
      const paint = document.getElementById(this.#rootId + "_paint");
      paint.setAttribute("width", image.clientWidth);
      paint.setAttribute("height", image.clientHeight);

      this.add(this.#data);
    });

    svg.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (this.#state === _DRAWINGSTATE) {
        this.#state = _DEFAULTSTATE;
        this.#StateBtnEnabled();
        document.getElementById(this.#focus).remove();
        this.#paths.pop();
      }
    });

    svg.addEventListener("click", (e) => {
      if (this.#state === _TEXTSTATE) {
        const paint = document.getElementById(this.#rootId + "_paint");
        const rect = paint.getBoundingClientRect();
        const memo = this.#createMemo(null, {
          x: e.pageX - rect.left,
          y: e.pageY - rect.top,
        });
        const canvasEl = document.getElementById(this.#rootId + "_canvas");
        canvasEl.appendChild(memo);

        this.#state = _DEFAULTSTATE;
        this.#StateBtnEnabled();
      } else if (this.#state === _LINESTATE) {
        const path = this.#createPath(e);

        // appendToBuffer(pt);
        // const strPath = "M" + pt.x + " " + pt.y;
        // path.setAttribute("d", strPath);

        const canvasEl = document.getElementById(this.#rootId + "_paint");
        canvasEl.appendChild(path);

        this.#state = _DRAWINGSTATE;
        // this.#focus = pathId;
        // this.#paths.push(path);
      } else if (this.#state === _DRAWINGSTATE) {
        const focus = this.#focus;

        // const endPath = document.getElementById(focus);

        const { x, y } = updateSvgPath(e, this.#rootId + "_paint", focus);

        const path = this.#createPath(e);

        const canvasEl = document.getElementById(this.#rootId + "_paint");
        canvasEl.appendChild(path);

        this.#state = _DRAWINGSTATE;
        // this.#focus = pathId;
        // this.#paths.push(path);
      }
    });

    svg.addEventListener("mousemove", (e) => {
      if (this.#state === _DRAWINGSTATE) {
        const focus = this.#focus;
        // appendToBuffer();
        // getMousePosition(e, this.#rootId + "_paint");

        console.log("Moving mouse:", { focus, e });
        const { x, y } = updateSvgPath(e, this.#rootId + "_paint", focus);
      }
    });

    canvas.appendChild(svg);
    canvas.appendChild(image);

    content.appendChild(canvas);

    return content;
  }

  #StateBtnEnabled() {
    this.#textStateEnabled();
    this.#lineStateEnabled();
  }

  #textStateEnabled() {
    const textAreaBtnEl = document.getElementById(
      this.#rootId + "_textArea_btn"
    );
    if (textAreaBtnEl) {
      textAreaBtnEl.classList.remove("active");
      textAreaBtnEl.removeAttribute("disabled");
    }
  }

  #textStateDisabled() {
    const textAreaBtnEl = document.getElementById(
      this.#rootId + "_textArea_btn"
    );
    if (textAreaBtnEl) {
      textAreaBtnEl.classList.add("active");
      textAreaBtnEl.setAttribute("disabled", true);
    }
  }

  #lineStateEnabled() {
    const lineBtnEl = document.getElementById(this.#rootId + "_line_btn");
    if (lineBtnEl) {
      lineBtnEl.classList.remove("active");
      lineBtnEl.removeAttribute("disabled");
    }
  }

  #lineStateDisabled() {
    const lineBtnEl = document.getElementById(this.#rootId + "_line_btn");
    if (lineBtnEl) {
      lineBtnEl.classList.add("active");
      lineBtnEl.setAttribute("disabled", true);
    }
  }
}
