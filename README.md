# WSH - tool to establish ssh connects

This tool allows acccess to devices behind APNs and other private networks. The device calls home on the websocket ring and allows homies to get into the device via ssh.

## prerequisites

* node 6.x+

## building

```bash
npm build
```

## installing (devel) 

```bash
npm link	# or  sudo npm link
```

## BIN

```bash
	js/ws.js <command> 	// general cli interface
```

# commands

## start WSH server on the server side


```bash
node ~/wsh/js/wsh.js server
```

## connect client to WSH server

```bash
node wsh/js/wsh.js client DEV001
```

## establish SSH connection to device

(from server side)

```bash
node ~/wsh/js/wsh.js DEV0001 deviceuser@localhost
```

