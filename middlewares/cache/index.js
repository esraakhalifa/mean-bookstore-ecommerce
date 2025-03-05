import {createClient} from 'redis';

const client = createClient();
client.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
  await client.connect('Redis is connected.');
}

connectRedis();
// const data = {
//   id: '123',
//   title: 'Redis in Action',
//   author: 'Josiah L. Carlson',
//   price: '25.99'
// };
// const cacheData = async (data) => {
//   await client.hSet('user-session:123', {data
//   });
// };

const getcachedData = async () => {
  const allCache = await client.hGetAll('user-session:123');
  console.log(allCache);
};

getcachedData();
// cacheData(data);
