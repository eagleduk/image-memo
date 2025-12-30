export class ImageMemoStorage {
  #rootId;
  #options;
  #memos = [];
  #paths = [];
  #ids = [];
  #focus = null;
  #state = _DEFAULTSTATE;
  #data = null;
  constructor(rootId, opt = {}) {
    this.#rootId = rootId;
    this.#options = opt;
    this.#memos = [];
    this.#ids = [];
    this.#focus = null;
  }
}
