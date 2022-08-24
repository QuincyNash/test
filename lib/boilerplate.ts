const boilerplate = `def starter():
    import sys
    import 
    from threading import Thread

    def respond():
        while True:
            print(sys.stdin.readline())

    thread = Thread(target=respond)
    thread.daemon = True
    thread.start()


starter()`;

export default boilerplate;
