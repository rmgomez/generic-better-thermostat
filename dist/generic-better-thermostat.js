const haPanel = customElements.get("ha-panel-lovelace");
const LitElement = haPanel ? Object.getPrototypeOf(haPanel) : null;
const html = LitElement?.prototype?.html;
const css = LitElement?.prototype?.css;

if (!LitElement || !html || !css) {
  throw new Error("Lit not available in Home Assistant.");
}

class GenericBetterThermostatCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: {},
      _entity: {},
      _humidity: {},
      _window: {},
    };
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("You need to define an entity");
    }

    this._config = {
      name: null,
      humidity_sensor: null,
      window_sensor: null,
      step: 0.5,
      min: null,
      max: null,
      ...config,
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;

    this._entity = hass.states[this._config.entity];
    this._humidity = this._config.humidity_sensor
      ? hass.states[this._config.humidity_sensor]
      : null;
    this._window = this._config.window_sensor
      ? hass.states[this._config.window_sensor]
      : null;

    this.requestUpdate();
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    return 3;
  }

  _onChangeTemp(delta) {
    if (!this._entity || !this._entity.attributes) return;
    const attrs = this._entity.attributes;
    const step = Number(this._config.step ?? 0.5);
    const currentTarget = Number(attrs.temperature);
    if (Number.isNaN(currentTarget)) return;

    const min = this._config.min ?? attrs.min_temp ?? 7;
    const max = this._config.max ?? attrs.max_temp ?? 35;

    let next = currentTarget + delta * step;
    if (next < min) next = min;
    if (next > max) next = max;

    this.hass.callService("climate", "set_temperature", {
      entity_id: this._config.entity,
      temperature: next,
    });
  }

  _toggleHvacMode() {
    if (!this._entity || !this._entity.state) return;
    const current = this._entity.state;
    const next = current === "heat" ? "off" : "heat";

    this.hass.callService("climate", "set_hvac_mode", {
      entity_id: this._config.entity,
      hvac_mode: next,
    });
  }

  _handleDialClick(e) {
    if (!this._entity) return;
    const attrs = this._entity.attributes;
    const min = this._config.min ?? attrs.min_temp ?? 7;
    const max = this._config.max ?? attrs.max_temp ?? 35;
    const step = Number(this._config.step ?? 0.5);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const angle = Math.atan2(y, x);
    const normalized = (angle + Math.PI * 1.5) % (Math.PI * 2);
    const ratio = normalized / (Math.PI * 2);

    let next = min + ratio * (max - min);
    next = Math.round(next / step) * step;
    next = Math.max(min, Math.min(max, next));

    this.hass.callService("climate", "set_temperature", {
      entity_id: this._config.entity,
      temperature: next,
    });
  }

  _formatTemp(value) {
    if (value === undefined || value === null) return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return "-";
    return num.toFixed(1).replace(/\.0$/, "");
  }

  _formatHumidity() {
    if (!this._humidity) return "--%";
    const v = this._humidity.state;
    if (v === undefined || v === null || v === "unknown") return "--%";
    return `${v}%`;
  }

  _windowOpen() {
    return this._window && this._window.state === "on";
  }

  render() {
    if (!this._entity) {
      return html`<ha-card class="card">
        <div class="missing">Entity not found</div>
      </ha-card>`;
    }

    const name = this._config.name ?? this._entity.attributes.friendly_name ?? "Thermostat";
    const attrs = this._entity.attributes || {};
    const currentTemp = attrs.current_temperature;
    const targetTemp = attrs.temperature;
    const hvacMode = this._entity.state;
    const isHeating = hvacMode === "heat";
    const windowOpen = this._windowOpen();

    const min = this._config.min ?? attrs.min_temp ?? 7;
    const max = this._config.max ?? attrs.max_temp ?? 35;
    const targetRatio = (Number(targetTemp) - min) / (max - min);
    const clampedRatio = Math.max(0, Math.min(1, Number.isFinite(targetRatio) ? targetRatio : 0));

    const radius = 110;
    const circumference = 2 * Math.PI * radius;
    const gap = circumference * 0.18;
    const arc = circumference - gap;
    const progress = arc * clampedRatio;

    const angle = clampedRatio * 2 * Math.PI - Math.PI / 2;
    const knobX = 150 + radius * Math.cos(angle);
    const knobY = 150 + radius * Math.sin(angle);

    return html`
      <ha-card class="card ${isHeating ? "mode-heat" : "mode-off"}">
        <div class="header">
          <div class="title">${name}</div>
          <ha-icon icon="mdi:dots-vertical" class="menu"></ha-icon>
        </div>

        <div class="dial" @click=${this._handleDialClick}>
          <svg class="dial-svg" viewBox="0 0 300 300">
            <circle
              class="dial-track"
              cx="150"
              cy="150"
              r="${radius}"
              stroke-dasharray="${arc} ${gap}"
            ></circle>
            <circle
              class="dial-progress"
              cx="150"
              cy="150"
              r="${radius}"
              stroke-dasharray="${progress} ${circumference - progress}"
            ></circle>
            <circle class="dial-knob" cx="${knobX}" cy="${knobY}" r="9"></circle>
            <circle class="dial-knob-inner" cx="${knobX}" cy="${knobY}" r="4"></circle>
          </svg>

          <div class="dial-center">
            <div class="top-icons">
              <ha-icon
                class="top-icon ${windowOpen ? "active" : ""}"
                icon="mdi:window-open-variant"
              ></ha-icon>
              <ha-icon
                class="top-icon ${isHeating ? "active" : ""}"
                icon="mdi:sun-thermometer"
              ></ha-icon>
            </div>

            <div class="main-temp">
              ${this._formatTemp(targetTemp)}
              <span class="unit">°</span>
            </div>

            <div class="divider"></div>

            <div class="sub-row">
              <span class="sub">${this._formatTemp(currentTemp)}°</span>
              <ha-icon class="sub-icon ${isHeating ? "active" : ""}" icon="mdi:fire"></ha-icon>
              <span class="sub">${this._formatHumidity()}</span>
            </div>
          </div>
        </div>

        <div class="mode-row">
          <button class="mode-btn ${isHeating ? "active" : ""}" @click=${this._toggleHvacMode}>
            <ha-icon icon="mdi:fire"></ha-icon>
          </button>
          <button class="mode-btn" disabled>
            <ha-icon icon="mdi:leaf"></ha-icon>
          </button>
          <button class="mode-btn ${!isHeating ? "active" : ""}" @click=${this._toggleHvacMode}>
            <ha-icon icon="mdi:power"></ha-icon>
          </button>
        </div>

        <div class="controls">
          <button class="control-btn" @click=${(e) => { e.stopPropagation(); this._onChangeTemp(-1); }}>
            <ha-icon icon="mdi:minus"></ha-icon>
          </button>
          <button class="control-btn" @click=${(e) => { e.stopPropagation(); this._onChangeTemp(1); }}>
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        --bt-text: var(--primary-text-color);
        --bt-muted: var(--secondary-text-color);
        --bt-card: var(--card-background-color, #1f1f1f);
        --bt-track: color-mix(in srgb, var(--bt-text) 12%, transparent);
        --bt-mode-color: var(--state-climate-heat-color, #c0392b);
      }

      .card {
        padding: 16px 16px 18px;
        background: var(--bt-card);
        position: relative;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }

      .title {
        font-size: 18px;
        font-weight: 500;
        color: var(--bt-text);
      }

      .menu {
        color: var(--bt-muted);
      }

      .dial {
        position: relative;
        width: 100%;
        max-width: 260px;
        margin: 4px auto 2px;
        aspect-ratio: 1 / 1;
        cursor: pointer;
      }

      .dial-svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .dial-track {
        fill: none;
        stroke: var(--bt-track);
        stroke-width: 18;
        stroke-linecap: round;
      }

      .dial-progress {
        fill: none;
        stroke: var(--bt-mode-color);
        stroke-linecap: round;
        stroke-width: 18;
      }

      .dial-knob {
        fill: var(--bt-text);
        filter: drop-shadow(0 0 4px color-mix(in srgb, var(--bt-mode-color) 60%, transparent));
      }

      .dial-knob-inner {
        fill: var(--bt-mode-color);
      }

      .dial-center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .top-icons {
        display: flex;
        gap: 20px;
        margin-bottom: 6px;
      }

      .top-icon {
        color: var(--bt-muted);
        --mdc-icon-size: 22px;
      }

      .top-icon.active {
        color: var(--bt-mode-color);
      }

      .main-temp {
        font-size: 44px;
        font-weight: 500;
        color: var(--bt-text);
        line-height: 1;
      }

      .unit {
        font-size: 16px;
        color: var(--bt-muted);
        vertical-align: super;
        margin-left: 4px;
      }

      .divider {
        margin: 12px 0 8px;
        width: 75%;
        height: 1px;
        background: var(--bt-track);
      }

      .sub-row {
        display: flex;
        align-items: center;
        gap: 14px;
        color: var(--bt-muted);
        font-size: 14px;
      }

      .sub-icon {
        color: var(--bt-muted);
        --mdc-icon-size: 18px;
      }

      .sub-icon.active {
        color: var(--bt-mode-color);
      }

      .mode-row {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin: 8px 0 2px;
      }

      .mode-btn {
        background: transparent;
        border: none;
        color: var(--bt-muted);
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .mode-btn.active {
        color: var(--bt-mode-color);
      }

      .mode-btn[disabled] {
        opacity: 0.5;
        cursor: default;
      }

      .controls {
        display: flex;
        justify-content: center;
        gap: 24px;
        margin-top: 10px;
      }

      .control-btn {
        background: transparent;
        border: 1px solid var(--bt-track);
        color: var(--bt-text);
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .mode-heat {
        --bt-mode-color: var(--state-climate-heat-color, #c0392b);
      }

      .mode-off {
        --bt-mode-color: var(--disabled-text-color, #9d9d9d);
      }

      .missing {
        padding: 16px;
        color: var(--bt-muted);
      }
    `;
  }
}

customElements.define("generic-better-thermostat-card", GenericBetterThermostatCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "generic-better-thermostat-card",
  name: "Generic Better Thermostat",
  description: "A generic thermostat card with circular dial and status pills.",
});
