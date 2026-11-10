import paramiko, socket
users = ["root","ubuntu","admin","centos","debian","ecs-user"]
pwd = "!Lsj20041021"
host = "47.111.175.191"
for u in users:
    c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        c.connect(host, 22, u, pwd, timeout=12, allow_agent=False, look_for_keys=False, banner_timeout=12)
        stdin, stdout, stderr = c.exec_command("id; hostname; uname -a; cat /etc/os-release | head -3")
        print("SUCCESS", u)
        print(stdout.read().decode("utf-8","replace"))
        print(stderr.read().decode("utf-8","replace")[:300])
        c.close(); break
    except Exception as e:
        print("FAIL", u, type(e).__name__, str(e)[:160])
