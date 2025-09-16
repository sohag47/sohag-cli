# sohag-cli

A simple CLI tool to display your local and public IP addresses, MAC addresses, and check the status of custom application ports. Useful for developers and network admins to quickly view network info and monitor running services.

## Features

- Show local IP and MAC addresses for all network interfaces
- Display your public IP address
- Check status of custom ports (active/inactive, PID, URL)
- Easily edit your custom port list

## Installation

You need [Node.js](https://nodejs.org/) installed.

> **Note:** This package is intended to be installed globally.

```sh
npm install -g sohag-cli
```

Or, if you want to use locally, run commands with `npx`:

```sh
npx sohag ip
```

## Usage

### Show IP and MAC info

```sh
sohag ip
```

### Check custom ports status

```sh
sohag ports
```

### Edit your custom ports list

```sh
sohag ports-edit
```

This opens your `ports-list.json` file in Notepad (Windows) or Nano (Linux/macOS). Add or modify entries as needed.

## How It Works

- On first run, a file `ports-list.json` is created in your home directory under `.sohag-cli`.
- The `ip` command shows all local IPv4 addresses and MACs, plus your public IP.
- The `ports` command checks each port in your custom list and shows if it's active, its PID, and the associated URL.
- The `ports-edit` command lets you edit your custom port list easily.

## Example `ports-list.json`

```
[
  { "name": "App1", "port": "3000", "url": "http://localhost:3000" },
  { "name": "App2", "port": "8080", "url": "http://localhost:8080" },
  { "name": "App3", "port": "5000", "url": "http://localhost:5000" }
]
```

## Author

Minhazul Islam Sohag <minhazul.islamcse@gmail.com>
