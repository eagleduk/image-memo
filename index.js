import { getMousePosition, updateSvgPath } from "./position.js";

// 시작전(이미지 로드 전), 이미지 로드 후, 텍스트 박스 찍기, 텍스트 입력 중, 라인 그리기 시작, 라인 그리는 중
const _READYSTATE = null;
const _DEFAULTSTATE = 0;
const _TEXTSTATE = 10;
const _TYPINGSTATE = 11;
const _LINESTATE = 20;
const _DRAWINGSTATE = 21;

// 등록/삭제 상태
const _CREATE = 1;
const _DELETE = -1;

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
  #state = _READYSTATE;

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
    this.#changeFocus(null);

    this.#render();

    // TODO: 윈도우가 아닌 root 영역으로 잡는게 좋을 듯.
    window.addEventListener("click", this.#onWindowClickEventHandler);

    // TODO: keypress 이벤트 deprecated
    window.addEventListener("keypress", this.#onWindowKeypressEventHandler);

    window.addEventListener("keydown", this.#onWindowKeydownEventHandler);
  }

  #addTimeLine({ type, element }) {
    console.log("before add timeline: ", [...this.#prevState]);
    this.#prevState.push({ type, target: element.id, element });
    this.#nextState = [];
    console.log("after add timeline: ", [...this.#prevState]);
  }

  // INFO: 임시 rgb => hex
  #rgb2Hex(_rgbColor) {
    if (_rgbColor === "") return "#000000";
    const r =
      "#" +
      _rgbColor
        .match(/rgb[a]{0,1}\((\d+)\,[\s]{0,}(\d+)\,[\s]{0,}(\d+)/)
        .filter((_, i) => i > 0 && i <= 3)
        .map((v) => parseInt(v).toString(16).padStart(2, "0"))
        .join("");
    return r;
  }

  #changeFocus(element) {
    console.log("change focus", element);
    if (!element) {
      this.#focus = null;
      return;
    }
    this.#focus = element.id;

    const textColorPicker = document.getElementById(
      this.#rootId + "_text_color_picker"
    );
    const textSizePicker = document.getElementById(
      this.#rootId + "_text_size_picker"
    );
    const borderColorPicker = document.getElementById(
      this.#rootId + "_border_color_picker"
    );

    if (element.nodeName === "ARTICLE") {
      const {
        style: { color, fontSize, borderColor },
      } = element;

      textColorPicker.value = this.#rgb2Hex(color);
      textSizePicker.value = fontSize.slice(0, -2);
      borderColorPicker.value = this.#rgb2Hex(borderColor);
    } else if (element.nodeName === "path") {
      const {
        attributes: {
          stroke: { value: stroke },
        },
      } = element;
      borderColorPicker.value = this.#rgb2Hex(stroke);
    }
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
    window.removeEventListener("click", this.#onWindowClickEventHandler);
    window.removeEventListener("keypress", this.#onWindowKeypressEventHandler);
    window.removeEventListener("keydown", this.#onWindowKeydownEventHandler);

    const root = document.getElementById(this.#rootId);
    root.remove();
  }

  // #c = this.#onWindowClickEventHandler.bind(this);

  #onWindowClickEventHandler = function (e) {
    console.log("onWindowClickEventHandler ", e);
    const element = e.target;

    if (this.#state === _READYSTATE || this.#state === _DRAWINGSTATE) return;

    if (
      element.nodeName === "ARTICLE" ||
      (element.nodeName === "INPUT" && element.type === "color") ||
      (element.nodeName === "INPUT" && element.type === "number") ||
      element.nodeName === "path"
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

    this.#changeFocus(null);
  }.bind(this);

  #onWindowKeypressEventHandler = function (e) {
    console.log(this.#focus, "onShortcut ", e);
    if (this.#focus !== null) return;

    // TODO: 되돌리기 실행취소 테스트
    if (e.ctrlKey && e.code === "KeyZ") {
      console.log("실행취소 ", [...this.#prevState]);

      if (this.#prevState.length === 0) return;

      const latest = this.#prevState.pop();

      this.#nextState.push(latest);

      if (latest.type === _CREATE) {
        const element = document.getElementById(latest.target);
        element.remove();
      } else if (latest.type === _DELETE) {
        const element = latest.element;

        if (element.nodeName === "ARTICLE") {
          const canvasEl = document.getElementById(this.#rootId + "_canvas");
          canvasEl.appendChild(element);
        }

        if (element.nodeName === "path") {
          const canvasEl = document.getElementById(this.#rootId + "_paint");
          canvasEl.appendChild(element);
        }
      }
    }
    if (e.ctrlKey && e.code === "KeyY") {
      console.log("되돌리기");

      if (this.#nextState.length === 0) return;

      const latest = this.#nextState.pop();

      this.#prevState.push(latest);

      if (latest.type === _CREATE) {
        const element = latest.element;

        if (element.nodeName === "ARTICLE") {
          const canvasEl = document.getElementById(this.#rootId + "_canvas");
          canvasEl.appendChild(element);
        }

        if (element.nodeName === "path") {
          const canvasEl = document.getElementById(this.#rootId + "_paint");
          canvasEl.appendChild(element);
        }
      } else if (latest.type === _DELETE) {
        const element = document.getElementById(latest.target);
        element.remove();
      }
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
  }.bind(this);

  #onWindowKeydownEventHandler = function (e) {
    console.log("extra Key", e);
    if (e.code === "Escape") {
      this.#state = _DEFAULTSTATE;
      this.#onWindowClickEventHandler(e);
    } else if (e.code === "Delete") {
      if (this.#state === _TYPINGSTATE) {
        return;
      }
      if (this.#focus) {
        // TODO: 텍스트 입력중 바로 삭제해버림. 입력중 상태라도 필요할 듯
        const element = document.getElementById(this.#focus);
        this.#addTimeLine({ type: _DELETE, element: element });
        element.remove();
        this.#changeFocus(null);
      }
    }
  }.bind(this);

  #render() {
    const root = document.getElementById(this.#rootId);

    const toolbar = this.#renderToolbar();
    const content = this.#renderContent();

    root.appendChild(toolbar);
    root.appendChild(content);

    root.addEventListener("keyup", (e) => {
      console.log("keyup", e);
    });
  }

  #renderToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    const fileEl = document.createElement("input");
    fileEl.type = "file";
    fileEl.addEventListener("change", (e) => {
      const imgEl = document.getElementById(this.#rootId + "_image");
      const uploadFile = e.target.files;

      this.#memos = [];
      this.#paths = [];

      this.#ids = [];

      this.#changeFocus(null);
      this.#state = _READYSTATE;

      this.#data = null;

      this.#prevState = [];
      this.#nextState = [];

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

    const textColorPicker = document.createElement("input");
    textColorPicker.id = this.#rootId + "_text_color_picker";
    textColorPicker.type = "color";
    textColorPicker.value = "#000000";
    textColorPicker.title = "텍스트 색상";
    textColorPicker.addEventListener("input", (e) => {
      const focus = this.#focus;
      if (!focus) return;

      const element = document.getElementById(focus);
      if (element && element.nodeName === "ARTICLE") {
        element.style.color = e.target.value;
      }
    });

    const textSizePicker = document.createElement("input");
    textSizePicker.id = this.#rootId + "_text_size_picker";
    textSizePicker.type = "number";
    textSizePicker.min = "8";
    textSizePicker.max = "72";
    textSizePicker.value = "16";
    textSizePicker.title = "텍스트 크기";
    textSizePicker.addEventListener("input", (e) => {
      const focus = this.#focus;
      if (!focus) return;

      const element = document.getElementById(focus);
      if (element && element.nodeName === "ARTICLE") {
        element.style.fontSize = e.target.value + "px";
      }
    });

    const borderColorPicker = document.createElement("input");
    borderColorPicker.id = this.#rootId + "_border_color_picker";
    borderColorPicker.type = "color";
    borderColorPicker.value = "#000000";
    borderColorPicker.title = "라인 색상";
    borderColorPicker.addEventListener("input", (e) => {
      console.log("line color", e);
      const focus = this.#focus;
      if (!focus) return;
      const element = document.getElementById(focus);
      if (element && element.nodeName === "ARTICLE") {
        element.style.borderColor = e.target.value;
      } else if (element && element.nodeName === "path") {
        element.setAttribute("stroke", e.target.value);
      }
    });

    toolbar.appendChild(textColorPicker);
    toolbar.appendChild(textSizePicker);
    toolbar.appendChild(borderColorPicker);

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
      this.#changeFocus(memo);
    });

    new ResizeObserver((entries) => {
      console.log("container resized", entries.target);
    }).observe(memo);

    const textArea = document.createElement("div");
    textArea.contentEditable = true;
    textArea.innerHTML = text;
    textArea.addEventListener("click", (e) => {
      e.stopPropagation();
      this.#state = _TYPINGSTATE;
      console.log("text area clicked", memoId);
      memo.classList.add("focus");
      this.#changeFocus(memo);
    });

    textArea.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        textArea.blur();
        memo.classList.remove("focus");
        this.#state = _DEFAULTSTATE;
        this.#changeFocus(null);
      }
    });

    memo.appendChild(textArea);
    // memo.contentEditable = true;

    this.#memos.push(memo);
    this.#ids.push(memoId);
    this.#addTimeLine({ type: _CREATE, element: memo });
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
      // e.stopPropagation();
      console.log("path clicked", pathId);
      this.#changeFocus(pathId);
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
    this.#changeFocus(path);
    this.#paths.push(path);
    this.#addTimeLine({ type: _CREATE, element: path });

    return path;
  }

  #renderContent() {
    const content = document.createElement("div");
    content.className = "memo_content";

    // content.addEventListener("keypress", (e) => this.#onWindowKeypressEventHandler(e));

    // content.addEventListener("keydown", (e) => {
    //   if (e.code === "Escape") {
    //     this.#onWindowClickEventHandler(e);
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
      this.#state = _DEFAULTSTATE;
    });

    svg.addEventListener("contextmenu", (e) => {
      if (this.#state === _DRAWINGSTATE) {
        e.preventDefault();
        this.#state = _DEFAULTSTATE;
        this.#StateBtnEnabled();
        document.getElementById(this.#focus).remove();
        this.#prevState.pop();
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
        const path = this.#createPath(e, {});

        // appendToBuffer(pt);
        // const strPath = "M" + pt.x + " " + pt.y;
        // path.setAttribute("d", strPath);

        const canvasEl = document.getElementById(this.#rootId + "_paint");
        canvasEl.appendChild(path);

        this.#state = _DRAWINGSTATE;
        // this.#changeFocus(path);
        // this.#paths.push(path);
      } else if (this.#state === _DRAWINGSTATE) {
        const focus = this.#focus;

        // const endPath = document.getElementById(focus);

        const { x, y } = updateSvgPath(e, this.#rootId + "_paint", focus);

        const path = this.#createPath(e, {});

        const canvasEl = document.getElementById(this.#rootId + "_paint");
        canvasEl.appendChild(path);

        this.#state = _DRAWINGSTATE;
        // this.#changeFocus(path);
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
