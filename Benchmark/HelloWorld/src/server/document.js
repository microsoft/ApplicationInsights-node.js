export default ({
    appString,
    js,
    styles,
    helmet,
}) => `
    <!doctype html>
    <html>
    <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"/>
        <meta http-equiv="X-UA-Compatible" content="ie=edge"/>
        
        ${styles}
        
        ${helmet.title.toString()}
    </head>
    <body>
    
      <div id="react-root">${appString}</div>
      
      ${js}
      
    </body>
    </html>
`;
