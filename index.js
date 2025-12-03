class ImageMemo {
  #rootId;
  #options;
  #memos = [];
  #ids = [];
  #focus = null;
  #numbering = 1;

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

  #boardControl(active) {
    const board = document.getElementById(this.#rootId + "_board");
    if(active) {
      board.querySelectorAll("button, textarea").forEach(el => el.disabled = false);
    } else {
      board.querySelectorAll("button, textarea").forEach(el => {
        el.disabled = true;
        if(el.nodeName === "TEXTAREA") {
          el.value = "";
        }
      });
    }
  }

  #onResetFocus = (e) => {
    const element = e.target;
    const nodeName = element.nodeName;

    if(nodeName === "IMG" || nodeName === "DIV") {
      this.#memos.forEach((memo) => {
        memo.classList.remove("focus");
      });
      this.#focus = null;
      
      this.#boardControl(false);
    }

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
    addBtnEl.textContent = "ADD";
    addBtnEl.addEventListener("click", (e) => {
      const memo = this.#createMemo();
      const canvasEl = document.getElementById(this.#rootId + "_canvas");
      canvasEl.appendChild(memo);
    });

    toolbar.appendChild(fileEl);
    toolbar.appendChild(saveEl);
    toolbar.appendChild(addBtnEl);

    return toolbar;
  }

  #createMemo(text) {
    const uuidStr = window.crypto
      .getRandomValues(new Uint32Array(1))[0]
      .toString(36);
    const memo = document.createElement("article");
    memo.draggable = true;
    memo.id = uuidStr;
    memo.className = "numbering";
    memo.dataset.anchor = "--" + this.#rootId + "-image";
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

      this.#boardControl(true);

    });
    memo.textContent = this.#numbering++;
    // memo.contentEditable = true;

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

    canvas.appendChild(image);

    const titleSpan = document.createElement("span");
    titleSpan.textContent = "";

    const memoSave = document.createElement("button");
    memoSave.textContent = "save";
    memoSave.className = "memo_action_button";
    memoSave.disabled = true;
    
    const memoDel = document.createElement("button");
    memoDel.textContent = "delete";
    memoDel.className = "memo_action_button";
    memoDel.disabled = true;

    const actionArea = document.createElement("p");
    actionArea.appendChild(memoSave);
    actionArea.appendChild(memoDel);

    const boardControl = document.createElement("div");
    // boardControl.textContent = "control-bar";
    boardControl.className = "board_control_bar";

    boardControl.appendChild(titleSpan);
    boardControl.appendChild(actionArea);

    const boardTextArea = document.createElement("div");

    const textarea = document.createElement("textarea");
    textarea.placeholder = "type memo text here...";
    textarea.className = "memo_action_text";
    textarea.disabled = true;

    const board = document.createElement("div");
    board.className = "board_wrapper unactive";
    board.id = this.#rootId + "_board";

    boardTextArea.appendChild(textarea);
    board.appendChild(boardControl);
    board.appendChild(boardTextArea);

    content.appendChild(canvas);
    content.appendChild(board);

    return content;
  }
}
