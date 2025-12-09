class ImageMemo {
  #rootId;
  #options;
  #memos = [];
  #ids = [];
  #focus = null;

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
      imgEl.style.display = "inline";
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

    const rectBtnEl = document.createElement("button");
    rectBtnEl.textContent = "Rect";
    rectBtnEl.addEventListener("click", () => {
      const canvas = document.getElementById(this.#rootId + "_canvas");
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = "red"; // Set the stroke color
      ctx.lineWidth = 2; // Set the stroke width
      ctx.draggable = true;
      ctx.id = "TEST";
      ctx.strokeRect(2, 2, 30, 30); // x, y, width, height
    });

    const downloadBtnEl = document.createElement("button");
    downloadBtnEl.textContent = "DownLoad";
    downloadBtnEl.addEventListener("click", () => {
      // var link = document.createElement("a");
      // link.download = "filename.png";
      // link.href = document.getElementById(this.#rootId + "_canvas").toDataURL();
      // link.click();

      const canvas = document.getElementById(this.#rootId + "_canvas");
      canvas.toBlob(
        (b) => {
          const blobUrl = URL.createObjectURL(b);

          const newImage = document.createElement("img");
          newImage.src = blobUrl;

          document.querySelector("body").appendChild(newImage);
        },
        "image/png",
        1
      );
    });

    toolbar.appendChild(fileEl);
    toolbar.appendChild(saveEl);
    toolbar.appendChild(addBtnEl);
    toolbar.appendChild(rectBtnEl);
    toolbar.appendChild(downloadBtnEl);

    return toolbar;
  }

  #createMemo(text) {
    const uuidStr = window.crypto
      .getRandomValues(new Uint32Array(1))[0]
      .toString(36);
    const memo = document.createElement("article");
    memo.draggable = true;
    memo.id = uuidStr;
    memo.className = "memo";
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

    const canvas = document.createElement("canvas");
    canvas.className = "image_wrapper";
    canvas.id = this.#rootId + "_canvas";
    // canvas.style.anchorName = "--" + this.#rootId + "-image";

    const image = document.createElement("img");
    // image.style.anchorName = "--" + this.#rootId + "-image";
    image.id = this.#rootId + "_image";
    image.addEventListener("load", (e) => {
      console.dir(image);
      const canvas = document.getElementById(this.#rootId + "_canvas");
      canvas.setAttribute("width", image.clientWidth);
      canvas.setAttribute("height", image.clientHeight);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(image, 0, 0, image.clientWidth, image.clientHeight);

      image.style.display = "none";
    });

    // canvas.appendChild(image);

    content.appendChild(canvas);
    content.appendChild(image);

    return content;
  }
}
