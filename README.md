# Generic Better Thermostat Card

A Home Assistant Lovelace custom card that mimics the visual layout of the Better Thermostat UI card while working with a standard `generic_thermostat` climate entity plus optional external humidity and window sensors.

## Features

- Circular dial with current and target temperature
- Plus/minus target temperature controls
- HVAC mode toggle (heat/off)
- Humidity and window status pills
- Theme-friendly styling using Home Assistant CSS variables

## Installation (HACS)

1. In HACS, add this repository as a **Custom Repository** with type **Dashboard**.
2. Install the card.
3. Ensure the resource is added:
   - HACS usually adds it automatically.
   - If you need to add it manually, use:
     - URL: `/hacsfiles/generic-better-thermostat/generic-better-thermostat.js`
     - Type: `JavaScript Module`

## Manual Installation

1. Copy `dist/generic-better-thermostat.js` to your Home Assistant `/config/www/` folder.
2. Add the resource in Home Assistant:
   - URL: `/local/generic-better-thermostat.js`
   - Type: `JavaScript Module`

## Usage

Add to your Lovelace dashboard:

```yaml
type: custom:generic-better-thermostat-card
entity: climate.my_generic_plug
humidity_sensor: sensor.my_room_humidity
window_sensor: binary_sensor.my_room_window_contact
name: Living Room
```

### Configuration

| Name              | Type    | Required | Default | Description |
|-------------------|---------|----------|---------|-------------|
| `entity`          | string  | Yes      | -       | Climate entity for `generic_thermostat`. |
| `humidity_sensor` | string  | No       | -       | Humidity sensor entity. |
| `window_sensor`   | string  | No       | -       | Window binary sensor entity. |
| `name`            | string  | No       | Entity name | Card title override. |
| `min`             | number  | No       | Climate `min_temp` or 7 | Min temperature for the dial and controls. |
| `max`             | number  | No       | Climate `max_temp` or 35 | Max temperature for the dial and controls. |
| `step`            | number  | No       | 0.5     | Temperature step for +/- controls and dial. |

## Behavior

- Clicking the dial sets the target temperature based on the click angle.
- The flame pill toggles HVAC mode between `heat` and `off`.
- Humidity and window pills reflect external sensor states.

## Development

The source file is `dist/generic-better-thermostat.js`.

## License

MIT
