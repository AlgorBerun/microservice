var createError = require('http-errors');
require('dotenv').config()
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');



const { Pool, Client } = require('pg');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/test', async (req, res) => {
  
  if(req.body.model === "expense") {
    if(req.body.event === "entry.update" || req.body.event === "entry.delete" || req.body.event === "entry.create") {

      const pool = new Pool();
      const expenses = await pool.query(`SELECT * FROM expenses WHERE income = ${req.body.entry.income.id}`);
      const category = await pool.query(`SELECT * FROM categories WHERE id = ${req.body.entry.income.category}`);
      
      let expenses_collection = 0;
      let expenses_piece = 0;

      for(let i=0; i<expenses.rowCount; i++) {
        if(expenses.rows[i].expense_collection) expenses_collection += expenses.rows[i].expense_collection;
        if(expenses.rows[i].expense_piece) expenses_piece += expenses.rows[i].expense_piece;
      }

      expenses_collection += Math.floor(expenses_piece/category.rows[0].n_piece_to_collection);
      expenses_piece = expenses_piece%category.rows[0].n_piece_to_collection;
      let query = `
        UPDATE incomes
        SET sold_quantity=table1.result_quantity
        FROM
          (
            SELECT income,
              SUM(
                CASE
                WHEN quantities IS NULL
                  THEN 0
                  ELSE quantities
                END
              ) as result_quantity
            FROM expenses
            GROUP BY income
          ) as table1
        WHERE incomes.id = table1.income;
      `;
      // await pool.query(`UPDATE incomes SET expense_collection = ${expenses_collection}, expense_piece = ${expenses_piece} WHERE id = ${req.body.entry.income.id}`);
      await pool.query(query);
      await pool.end();
    }
  } else {
    return res.json({a: 1});
  }
  res.json({a: 1});
});
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
