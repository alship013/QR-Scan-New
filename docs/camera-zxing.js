function cameraName(label) {
  let clean = label.replace(/\s*\([0-9a-f]+(:[0-9a-f]+)?\)\s*$/, '');
  return clean || label || null;
}

class MediaError extends Error {
  constructor(type) {
    super(`Cannot access video stream (${type}).`);
    this.type = type;
  }
}

class Camera {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this._stream = null;
  }

  async start() {
    let constraints = {
      audio: false,
      video: {
        deviceId: this.id ? { exact: this.id } : undefined,
        width: { min: 600, ideal: 800 },
        height: { min: 400 },
        aspectRatio: { min: 1.6 }
      }
    };

    this._stream = await Camera._wrapErrors(async () => {
      return await navigator.mediaDevices.getUserMedia(constraints);
    });

    return this._stream;
  }

  stop() {
    if (!this._stream) {
      return;
    }

    for (let stream of this._stream.getVideoTracks()) {
      stream.stop();
    }

    this._stream = null;
  }

  static async getCameras() {
    await this._ensureAccess();

    let devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'videoinput')
      .map(d => new Camera(d.deviceId, cameraName(d.label)));
  }

  static async _ensureAccess() {
    return await this._wrapErrors(async () => {
      let access = await navigator.mediaDevices.getUserMedia({ video: true });
      for (let stream of access.getVideoTracks()) {
        stream.stop();
      }
    });
  }

  static async _wrapErrors(fn) {
    try {
      return await fn();
    } catch (e) {
      if (e.name) {
        throw new MediaError(e.name);
      } else {
        throw e;
      }
    }
  }
}

// Make Camera available globally for browser usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Camera;
} else {
  window.Camera = Camera;
}
