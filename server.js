const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use(cors({
  origin: [
    'https://apah.site',
    'https://www.apah.site',
    'https://memo-web-psi.vercel.app'
  ],
  credentials: true
}));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 연결 테스트
db.getConnection((err, connection) => {
  if (err) {
    console.log('DB 연결 실패:', err);
  } else {
    console.log('DB 연결 성공');
    connection.release();
  }
});

// 로그인
app.post('/api/login', (req, res) => {
  const { id, pw } = req.body;
  
  db.query(
    'SELECT * FROM users WHERE ID = ?',
    [id],
    async (err, results) => {
      if (err) {
        console.error('DB 에러:', err);
        return res.json({ success: false });
      }

      if (results.length === 0) {
        return res.json({ success: false });
      }

      // 비밀번호 비교
      const match = await bcrypt.compare(pw, results[0].PW);
      
      if (match) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    }
  );
});

// 회원가입
app.post('/api/signup', (req, res) => {
  const { id, pw } = req.body;

  console.log('회원가입 시도:', id, pw);

  try {
    // 1. 중복 확인
    db.query(
      'SELECT * FROM users WHERE ID = ?',
      [id],
      async (err, results) => {
        if (err) {
          console.error('DB 에러:', err);
          return res.status(500).json({ success: false, message: '서버 오류' });
        }

        if (results.length > 0) {
          console.log('중복된 아이디');
          return res.json({ success: false, message: '이미 존재하는 아이디입니다' });
        }

        // 2. 비밀번호 해싱
        const hashedPw = await bcrypt.hash(pw, 10);

        // 3. 새 유저 생성
        db.query(
          'INSERT INTO users (ID, PW) VALUES (?, ?)',
          [id, pw],
          (err, result) => {
            if (err) {
              console.error('회원가입 에러:', err);
              return res.status(500).json({ success: false, message: '회원가입 실패' });
            }
            console.log('회원가입 성공:', result);
            res.json({ success: true, message: '회원가입 성공' });
          }
        );
      }
    );
  } catch (error) {
    console.error("암호화 에러: ", error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});


// 메모 조회
app.get('/api/memos/:userId', (req, res) => {
  db.query(
    'SELECT * FROM memos WHERE user_id = ? ORDER BY date DESC',
    [req.params.userId],
    (err, results) => {
      res.json(results);
    }
  );
});

// 메모 추가
app.post('/api/memos', (req, res) => {
  const { user_id, text, date } = req.body;
  db.query(
    'INSERT INTO memos (user_id, text, date) VALUES (?, ?, ?)',
    [user_id, text, date],
    (err, result) => {
      res.json({ success: true, id: result.insertId });
    }
  );
});

// 메모 삭제
app.delete('/api/memos/:memoId', (req, res) => {
  const memoId = req.params.memoId;

  db.query(
    'DELETE FROM memos WHERE memo_id = ?',
    [memoId],
    (err, result) => {
      if (err) {
        console.error('메모 삭제 에러:', err);
        return res.status(500).json({ success: false, message: '메모 삭제 실패' });
      }
      res.json({ success: true });
    }
  );
});

app.listen(3000, () => {
  console.log('서버 실행: http://localhost:3000');
});