const boilerplate = `def starter():
    import sys
    import time
    import json
    from threading import Thread
    from uhs_graphics import Scene
    from uhs_graphics._scene import KeyboardEvent, MouseEvent

    key = "${process.env.PYTHON_KEY}"

    def respond():
        while True:
            line = sys.stdin.readline()
            if line.startswith(key):
                obj = Scene._instances[0]
                props = json.loads(line[len(key):])
                if props["event"] in ["mousedown", "mouseup", "mousemove", "mousedrag", "doubleclick", "rightclick"]:
                    obj._trigger(props["event"], MouseEvent(x=props["x"], y=props["y"]))
                elif props["event"] in ["keydown", "keyup"]:
                    obj._trigger(props["event"], KeyboardEvent(key=props["key"], key_code=props["keyCode"], shift=props["shift"], ctrl=props["ctrl"], meta=props["meta"], alt=props["alt"]))
                elif props["event"] == "releaseall":
                    obj._trigger(props["event"], {})
            time.sleep(0.01)
        
    thread = Thread(target=respond)
    thread.daemon = True
    thread.start()

starter()`;

export default boilerplate;
