const _DEFAULTSTATE = null;
const _TEXTSTATE = 0;
const _LINESTATE = 1;
const _DRAWINGSTATE = 2;

class ImageMemoProxy {
  _rootId;
  // #rootId;
  _options = { TST: true };
  _memos = [];
  _paths = [];
  _ids = [];
  _focus = null;
  _state = _DEFAULTSTATE;
  _data = null;

  constructor(rootId, opt = {}) {
    return new Proxy(
      {
        ...this,
        _rootId: rootId,
        options: {
          ...this._options,
          ...opt,
        },
        setData: this.setData,
        add: this.add,
      },
      {
        set: (object, key, value, proxy) => {
          console.log("set ", key, object[key], value, object[key] !== value);
          if (object[key] !== value) {
            console.log("값 변경");
            object[key] = value;

            if (key === "_state") {
              console.log(proxy);
              this.changeState(value);
            }
            // if (key === "_focus") this.changeFocus();
          }
          return true;
        },
        get: (target, key) => {
          console.log("get", target, key);
          return target[key];
        },
      }
    );
  }
}
