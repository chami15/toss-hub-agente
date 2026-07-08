from utils.connection import PostgreConn


class Database:
    def __enter__(self):
        self.conn = PostgreConn()
        return self.conn

    def __exit__(self, exc_type, exc_value, exc_traceback):
        if self.conn:
            self.conn.close()
