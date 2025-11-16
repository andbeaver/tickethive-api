import express from 'express';
import sql from 'mssql';
import 'dotenv/config';

//const sql = require('mssql')

const router = express.Router();

const db_connection_string = process.env.DB_CONNECTION_STRING;

//GETs:

// Get all concerts
router.get('/', async (req, res) => {

    await sql.connect(db_connection_string);

    const result = await sql.query`SELECT a.[ConcertId], a.[Title] as ConcertTitle, a.[Description], a.[Location], a.[ConcertTime], a.[PublishDate], a.[Filename], 
b.[CategoryId], b.[CategoryName], c.[OwnerId], c.[OwnerName]
FROM [dbo].[Concert] a
INNER JOIN [dbo].[Category] b on a.[CategoryId] = b.[CategoryId]
INNER JOIN [dbo].[Owner] c on a.[OwnerId] = c.[OwnerId]
WHERE a.[ConcertTime] >= GetDate()
ORDER BY a.[ConcertTime] ASC`;

    res.json(result.recordset);
});


//Return concert IDs

router.get('/:id', async (req, res) =>{
    const id = (req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid Concert ID. It must be a number.'});
    }

    await sql.connect(db_connection_string);

    const result = await sql.query`SELECT a.[ConcertId], a.[Title] as ConcertTitle, a.[Description], a.[Location], a.[ConcertTime], a.[PublishDate], a.[Filename], 
b.[CategoryId], b.[CategoryName], c.[OwnerId], c.[OwnerName]
FROM [dbo].[Concert] a
INNER JOIN [dbo].[Category] b on a.[CategoryId] = b.[CategoryId]
INNER JOIN [dbo].[Owner] c on a.[OwnerId] = c.[OwnerId]
WHERE a.[ConcertId] = ${id};`;

    if(result.recordset.length === 0){
        return res.status(404).json({ error: 'Concert Not Found'})
    }

    res.json(result.recordset[0]);
});

// Purchases

router.post('/purchase', async (req, res) =>{
if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      error: 'Missing JSON body. Set Content-Type: application/json and send JSON in request body.'
    });
  }

  
  const purchase = req.body;

  const concertId = Number(purchase.ConcertId);
  const numTickets = Number(purchase.NumOfTickets);

  const required = ['NumOfTickets','Name','Email','NameOnCard','CardNumber','ExpirationDate','CVV','ConcertId'];
  for (const field of required) {
    if (!(field in purchase)) {
      return res.status(400).json({ error: `Missing field: ${field}` });
    }
  }

  //validate input
  // Ensure card number is a string, remove white space
  const cardDigits = String(purchase.CardNumber || '').replace(/\s+/g, '');
  // Convert cvv to a string
  const cvv = String(purchase.CVV || '');
  const errors = [];
  // Ensure card number is 16 digits
  if (!/^\d{16}$/.test(cardDigits)) errors.push('CardNumber must be exactly 16 digits.');
  //Ensure cvv is 3 digits
  if (!/^\d{3}$/.test(cvv)) errors.push('CVV must be exactly 3 digits.');
  // Esnure concert is a positive int
  if (!Number.isInteger(concertId) || concertId <= 0) errors.push('ConcertId must be a positive integer.');
  // Esnure num of tickets is positive
  if (!Number.isInteger(numTickets) || numTickets <= 0) errors.push('NumOfTickets must be a positive integer.');


  // Handle 400 bad request
  if (errors.length) {
    return res.status(400).json({ errors });
  }

   try {
    await sql.connect(db_connection_string);

    // Verify the concertid exists
    const concertCheck = await sql.query`SELECT ConcertId FROM dbo.Concert WHERE ConcertId = ${concertId}`;
    if (!concertCheck.recordset || concertCheck.recordset.length === 0) {
      return res.status(400).json({ error: `ConcertId ${concertId} does not exist.` });
    }

    const result = await sql.query`
      INSERT INTO [dbo].[Purchase] (NumOfTickets, Name, Email, NameOnCard, CardNumber, ExpirationDate, CVV, ConcertId)
      OUTPUT INSERTED.PurchaseId
      VALUES (${purchase.NumOfTickets}, ${purchase.Name}, ${purchase.Email}, ${purchase.NameOnCard}, ${cardDigits}, 
              ${purchase.ExpirationDate}, ${purchase.CVV}, ${purchase.ConcertId})`;

    if (result.rowsAffected[0] === 0) { // Handle 500 fail
      return res.status(500).json({ error: 'Failed to insert purchase.' });
    }

    const insertedId = result.recordset?.[0]?.PurchaseId; // Confirm Purchase was successful
    res.status(201).json({ message: 'Purchase inserted.', id: insertedId });
  } catch (err) {
    // Catch any db errors
    console.error('POST /purchase error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// {
//   "NumOfTickets": 5,
//   "Name": "New cust",
//   "Email": "andrew@example.com",
//   "NameOnCard": "Andrew",
//   "CardNumber": "1234566543216789",
//   "ExpirationDate": "0126",
//   "CVV": "wer",
//   "ConcertId": 20
// }

//GET to show purchases

// router.get('/:id/purchases', async (req, res) => {
//   const id = req.params.id;
//   if (isNaN(id)) return res.status(400).json({ error: 'Invalid Concert ID' });

//   try {
//     await sql.connect(db_connection_string);

//     const result = await sql.query`
//       SELECT PurchaseId, NumOfTickets, Name, Email, NameOnCard, CardNumber, ExpirationDate, CVV, ConcertId
//       FROM dbo.Purchase WHERE ConcertId = ${id}`;

//     res.json(result.recordset);
//   } catch (err) {
//     console.error(`GET /${id}/purchases error:`, err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });



export default router;