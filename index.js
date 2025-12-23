const _DEFAULTSTATE = null;
const _TEXTSTATE = 0;
const _LINESTATE = 1;
const _DRAWINGSTATE = 2;

function getMousePosition(e) {
  const rect = e.srcElement.getBoundingClientRect();
  return {
    x: e.pageX - rect.left,
    y: e.pageY - rect.top,
  };
}

function updateSvgPath(e) {
  const rect = e.srcElement.getBoundingClientRect();

  const target = document.getElementById("TEST");
  const a = target.getAttribute("d");
  const strPath = a + " L" + (e.pageX - rect.left) + " " + (e.pageY - rect.top);
  // Get the smoothed part of the path that will not change

  target.setAttribute("d", strPath);

  // strPath += " L" + pt.x + " " + pt.y;

  // // Get the last part of the path (close to the current mouse position)
  // // This part will change if the mouse moves again
  // var tmpPath = "";
  // for (var offset = 2; offset < buffer.length; offset += 2) {
  //   pt = getAveragePoint(offset);
  //   tmpPath += " L" + pt.x + " " + pt.y;
  // }

  // // Set the complete current path coordinates
  // path.setAttribute("d", strPath + tmpPath);
}

// const buffer = [];
// function appendToBuffer(pt) {
//   buffer.push(pt);
//   while (buffer.length > bufferSize) {
//     buffer.shift();
//   }
// }

class ImageMemo {
  #rootId;
  #options;
  #memos = [];
  #ids = [];
  #focus = null;
  #state = _DEFAULTSTATE;

  constructor(rootId, opt = {}) {
    this.#rootId = rootId;
    this.#options = opt;
    this.#memos = [];
    this.#ids = [];
    this.#focus = null;

    this.#render();

    window.addEventListener("click", this.#onResetFocus);
  }

  destroy() {
    window.removeEventListener("click", this.#onResetFocus);
  }

  #onResetFocus = (e) => {
    const element = e.target;

    if (
      element.nodeName === "ARTICLE" ||
      (element.nodeName === "INPUT" && element.type === "color")
    ) {
      return;
    }

    this.#memos.forEach((memo) => {
      memo.classList.remove("focus");
    });

    this.#focus = null;
  };

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
      this.#memos.forEach((memo) => {
        const {
          textContent,
          style: { top, left, backgroundColor, color },
          id,
        } = memo;

        console.log(
          "id" +
            id +
            ", " +
            "textContent " +
            textContent +
            ", top: " +
            top +
            ", left: " +
            left +
            ", backg: " +
            backgroundColor +
            ", color: " +
            color
        );
      });
    });

    const addBtnEl = document.createElement("button");
    addBtnEl.textContent = "[ T ]";
    addBtnEl.addEventListener("click", (e) => {
      this.#state = _TEXTSTATE;

      // const memo = this.#createMemo();
      // const canvasEl = document.getElementById(this.#rootId + "_canvas");
      // canvasEl.appendChild(memo);
    });

    const addLineBtnEl = document.createElement("button");
    addLineBtnEl.textContent = "[ L ]";
    addLineBtnEl.addEventListener("click", (e) => {
      this.#state = _LINESTATE;
    });

    toolbar.appendChild(fileEl);
    toolbar.appendChild(saveEl);
    toolbar.appendChild(addBtnEl);
    toolbar.appendChild(addLineBtnEl);

    return toolbar;
  }

  #createMemo(text = "", { x = 0, y = 0 }) {
    const uuidStr = window.crypto
      .getRandomValues(new Uint32Array(1))[0]
      .toString(36);
    const memo = document.createElement("article");
    memo.draggable = true;
    memo.id = uuidStr;
    memo.className = "memo";
    memo.dataset.anchor = "--" + this.#rootId + "-image";
    memo.style.top = y + "px";
    memo.style.left = x + "px";

    memo.addEventListener("dragstart", (e) => {
      const {
        layerX,
        layerY,
        target: { clientWidth, clientHeight },
      } = e;

      // e.currentTarget.classList.add(styles.drag_start);
      e.currentTarget.setAttribute("layerX", String(layerX));
      e.currentTarget.setAttribute("layerY", String(layerY));
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

      e.target.classList.add("focus");
      this.#focus = e.target.id;
    });
    memo.textContent = text;
    memo.contentEditable = true;

    this.#memos.push(memo);
    this.#ids.push(uuidStr);
    return memo;
  }

  #renderContent() {
    const content = document.createElement("div");
    content.className = "memo_content";

    const canvas = document.createElement("div");
    canvas.className = "image_wrapper";
    canvas.id = this.#rootId + "_canvas";

    const image = document.createElement("img");
    image.style.anchorName = "--" + this.#rootId + "-image";
    image.id = this.#rootId + "_image";

    image.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.#state = _DEFAULTSTATE;
    });

    image.addEventListener("click", (e) => {
      if (this.#state === _TEXTSTATE) {
        const memo = this.#createMemo("", { x: 100, y: 100 });
        const canvasEl = document.getElementById(this.#rootId + "_canvas");
        canvasEl.appendChild(memo);

        this.#state === _DEFAULTSTATE;
      } else if (this.#state === _LINESTATE) {
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute("id", "TEST");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "red");
        path.setAttribute("stroke-width", 10);
        var pt = getMousePosition(e);
        // appendToBuffer(pt);
        const strPath = "M" + pt.x + " " + pt.y;
        path.setAttribute("d", strPath);

        const canvasEl = document.getElementById(this.#rootId + "_canvas");
        canvasEl.appendChild(path);

        this.#state = _DRAWINGSTATE;
      }
    });

    image.addEventListener("mousemove", (e) => {
      if (this.#state === _DRAWINGSTATE) {
        // appendToBuffer();
        getMousePosition(e);
        updateSvgPath(e);
      }
    });

    canvas.appendChild(image);
    content.appendChild(canvas);

    return content;
  }
}
