import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {parseDocument} from 'yaml'
import {updateProfilePatch,repairProfilePatch} from '../lib/types/host/profile-patch.js'

test('mixed manager edits repair legacy flow arrays and retain Cordis expressions and user settings', () => {
  const source = '# user configuration\n[ { id: web-ui-market, disabled: true }, { id: custom, config: { roots: !!js "[ctx.learningPresetSource]" } } ]\n# BEGIN portable-plugin-manager\n- id: cluster-ui\n  disabled: true\n# END portable-plugin-manager\n'
  const repaired=repairProfilePatch(source)
  const changed=updateProfilePatch(repaired,[{id:'web-ui-market',disabled:false},{id:'cluster-ui',disabled:false}])
  const doc=parseDocument(changed,{customTags:[{tag:'tag:yaml.org,2002:js',resolve:value=>value}]})
  assert.deepEqual(doc.errors,[])
  assert.deepEqual(doc.toJS(),[{id:'web-ui-market',disabled:false},{id:'custom',config:{roots:'[ctx.learningPresetSource]'}},{id:'cluster-ui',disabled:false}])
  assert.match(changed,/# user configuration/)
  assert.match(changed,/!!js/)
  assert.equal(repairProfilePatch(changed),changed)
  assert.equal(updateProfilePatch(changed,[{id:'cluster-ui',disabled:false}]),changed)
  const commentOnly='# official comments\n# BEGIN portable-plugin-manager\n- id: cluster-ui\n  disabled: true\n# END portable-plugin-manager\n'
  assert.deepEqual(parseDocument(repairProfilePatch(commentOnly)).toJS(),[{id:'cluster-ui',disabled:true}])
})
