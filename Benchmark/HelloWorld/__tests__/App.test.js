import React from 'react';
import renderer from 'react-test-renderer';

import App from '../src/shared/App';

describe('App', () => {
    it('matches snapshot', () => {
        const component = renderer.create(
            <App/>
        );

        const tree = component.toJSON();
        expect(tree).toMatchSnapshot();
    });
});
