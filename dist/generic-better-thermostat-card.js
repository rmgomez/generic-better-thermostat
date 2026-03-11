import { LitElement, html, css } from "lit";

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

    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const dash = circumference * clampedRatio;

    return html`
      <ha-card class="card">
        <div class="header">
          <div class="title">${name}</div>
          <ha-icon icon="mdi:dots-vertical" class="menu"></ha-icon>
        </div>

        <div class="dial" @click=${this._handleDialClick}>
          <svg class="dial-svg" viewBox="0 0 300 300">
            <circle class="dial-track" cx="150" cy="150" r="${radius}"></circle>
            <circle
              class="dial-progress"
              cx="150"
              cy="150"
              r="${radius}"
              stroke-dasharray="${dash} ${circumference - dash}"
            ></circle>
          </svg>
          <div class="dial-center">
            <div class="current">${this._formatTemp(currentTemp)}°</div>
            <div class="target">Target ${this._formatTemp(targetTemp)}°</div>
          </div>
          <div class="dial-controls">
            <button class="btn" @click=${(e) => { e.stopPropagation(); this._onChangeTemp(1); }}>
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
            <button class="btn" @click=${(e) => { e.stopPropagation(); this._onChangeTemp(-1); }}>
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
          </div>
        </div>

        <div class="pills">
          <button class="pill ${isHeating ? "active" : ""}" @click=${this._toggleHvacMode}>
            <ha-icon icon="mdi:fire"></ha-icon>
            <span>${isHeating ? "Heat" : "Off"}</span>
          </button>

          <div class="pill">
            <ha-icon icon="mdi:water-percent"></ha-icon>
            <span>${this._formatHumidity()}</span>
          </div>

          <div class="pill ${windowOpen ? "warning" : ""}">
            <ha-icon icon="mdi:window-open"></ha-icon>
            <span>${windowOpen ? "Open" : "Closed"}</span>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        --gbt-accent: var(--primary-color);
        --gbt-text: var(--primary-text-color);
        --gbt-muted: var(--secondary-text-color);
        --gbt-card: var(--card-background-color, #ffffff);
        --gbt-pill: var(--secondary-background-color, #f2f2f2);
        --gbt-danger: var(--error-color);
      }

      .card {
        padding: 16px;
        background: var(--gbt-card);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .title {
        font-size: 16px;
        font-weight: 600;
        color: var(--gbt-text);
      }

      .menu {
        color: var(--gbt-muted);
      }

      .dial {
        position: relative;
        width: 100%;
        max-width: 320px;
        margin: 0 auto 16px;
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
        stroke: var(--gbt-pill);
        stroke-width: 18;
      }

      .dial-progress {
        fill: none;
        stroke: var(--gbt-accent);
        stroke-linecap: round;
        stroke-width: 18;
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

      .current {
        font-size: 48px;
        font-weight: 700;
        color: var(--gbt-text);
        line-height: 1;
      }

      .target {
        margin-top: 6px;
        font-size: 14px;
        color: var(--gbt-muted);
      }

      .dial-controls {
        position: absolute;
        right: 12px;
        top: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .btn {
        background: var(--gbt-pill);
        border: none;
        color: var(--gbt-text);
        border-radius: 999px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .pills {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .pill {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 10px;
        border-radius: 999px;
        background: var(--gbt-pill);
        color: var(--gbt-text);
        font-size: 13px;
      }

      .pill.active {
        background: color-mix(in srgb, var(--gbt-accent) 20%, var(--gbt-pill));
        color: var(--gbt-accent);
      }

      .pill.warning {
        background: color-mix(in srgb, var(--gbt-danger) 20%, var(--gbt-pill));
        color: var(--gbt-danger);
      }

      .missing {
        padding: 16px;
        color: var(--gbt-muted);
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
