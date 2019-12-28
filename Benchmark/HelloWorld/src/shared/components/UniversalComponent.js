import universal from 'react-universal-component';

export default universal(({ name }) => import(`./${name}`));
