<template>
  <div :id="playerId" class="easy-player"></div>
</template>

<script>
export default {
  name: 'EasyWasmPlayer',
  emits: ['stream-error'],
  props: {
    videoUrl: {
      type: String,
      default: '',
    },
    hasaudio: {
      type: Boolean,
      default: false,
    },
    hasAudio: {
      type: Boolean,
      default: false,
    },
    height: {
      type: [String, Number, Boolean],
      default: false,
    },
    decodeType: {
      type: String,
      default: 'auto',
    },
  },
  data() {
    return {
      easyPlayer: null,
      playerId: `easyplayer-${Math.random().toString(36).slice(2)}`,
    };
  },
  mounted() {
    this.$nextTick(() => {
      if (this.videoUrl) this.play(this.videoUrl);
    });
  },
  watch: {
    videoUrl(newUrl) {
      if (newUrl) {
        this.play(newUrl);
      } else {
        this.destroyPlayer();
      }
    },
    decodeType() {
      if (this.videoUrl) this.play(this.videoUrl);
    },
  },
  beforeUnmount() {
    this.destroyPlayer();
  },
  destroyed() {
    this.destroyPlayer();
  },
  methods: {
    createPlayer() {
      if (typeof window === 'undefined' || !window.WasmPlayer) {
        this.$emit('stream-error', { type: 'missing-wasm-player' });
        return null;
      }
      return new window.WasmPlayer(null, this.playerId, this.eventCallback, {
        Height: this.height,
        decodeType: this.decodeType,
        openAudio: this.hasaudio || this.hasAudio ? 1 : 0,
      });
    },
    destroyPlayer() {
      if (this.easyPlayer && typeof this.easyPlayer.destroy === 'function') {
        this.easyPlayer.destroy();
      }
      this.easyPlayer = null;
    },
    play(url) {
      const target = typeof url === 'string' ? url.trim() : '';
      if (!target) return;
      this.destroyPlayer();
      const player = this.createPlayer();
      if (!player) return;
      this.easyPlayer = player;
      this.easyPlayer.play(target, 1);
    },
    pause() {
      this.destroyPlayer();
    },
    eventCallback(type, message) {
      if (type === 'error' || type === 'timeout') {
        this.$emit('stream-error', { type, detail: message });
      }
    },
  },
};
</script>

<style>
.easy-player {
  width: 100%;
  height: 100%;
  background: #000c17;
}

.iconqingxiLOGO {
  display: none !important;
}
</style>
