import test from 'ava';

import path from 'path';
import fse from 'fs-extra';
import kaitaiStruct from 'kaitai-struct';
import PokesavDppt from '../formats-compiled/PokesavDppt';

import { asDate } from '../lib/util';
import { decryptPokemon } from '../lib/encryption-and-order';

test.beforeEach(async t => {
  const savefile = await fse.readFile(
    path.join(__dirname, '../testdata/diamond.sav'),
    { encoding: null }
  );

  t.context.data = new PokesavDppt(
    new kaitaiStruct.KaitaiStream(savefile)
  );

  t.context.decryptedParty = t.context.data.generalBlockCurrent.partyPokemon
    .map(pkmn => {
      const decryptedData = decryptPokemon(pkmn.base);

      return {
        base: pkmn,
        data: new PokesavDppt.PokemonData(
          new kaitaiStruct.KaitaiStream(decryptedData)
        )
      };
    });
});

test('adventure started', t => {
  const { adventureStartTime } = t.context.data.generalBlockCurrent;
  const startDate = asDate(adventureStartTime);

  t.is(startDate.getFullYear(), 2016);
});

test('all pokemon in party belong to this savefile', t => {
  const trainerId = t.context.data.generalBlockCurrent.trainerId;
  const secretId = t.context.data.generalBlockCurrent.secretId;

  let i = 0;
  for(const { data } of t.context.decryptedParty) {
    const originalTrainerId = data.blockA.originalTrainerId;
    const originalTrainerSecretId = data.blockA.originalTrainerSecretId;

    t.is(originalTrainerId, trainerId, `expected pokemon #${++i}'s trainer ID to match savefile's trainer ID`);
    t.is(originalTrainerSecretId, secretId, `expected pokemon #${i}'s secret ID to match savefile's secret ID`);
  }
});

test('correct ivs and isEgg, isNicknamed flags', t => {
  const party = t.context.decryptedParty;

  const expected = [
    {
      ivHp: 24,
      ivAttack: 25,
      ivDefense: 16,
      ivSpeed: 6,
      ivSpecialAttack: 27,
      ivSpecialDefense: 2
    },
    {
      ivHp: 28,
      ivAttack: 2,
      ivDefense: 13,
      ivSpeed: 11,
      ivSpecialAttack: 31,
      ivSpecialDefense: 15
    }
  ];

  const actual = party.map(pkmn => ({
    ivHp: pkmn.data.blockB.iv.hp,
    ivAttack: pkmn.data.blockB.iv.attack,
    ivDefense: pkmn.data.blockB.iv.defense,
    ivSpeed: pkmn.data.blockB.iv.speed,
    ivSpecialAttack: pkmn.data.blockB.iv.specialAttack,
    ivSpecialDefense: pkmn.data.blockB.iv.specialDefense
  }));

  t.deepEqual(actual, expected, 'expected IVs to be correct');
});
