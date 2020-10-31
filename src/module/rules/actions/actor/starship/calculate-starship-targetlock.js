export default function (engine) {
    engine.closures.add("calculateStarshipTargetLock", (fact, context) => {
        const data = fact.data;
        const tl = CONFIG.SFRPG.armorDefenseMap[data.details.systems.defense] || 0;
        const sizeMod = CONFIG.SFRPG.starshipSizeMod[data.details.size] || 0;
        const misc = data.attributes.targetLock?.misc || 0;

        data.attributes.targetLock = {
            value: 10 + tl + misc + sizeMod,
            misc: misc,
            tooltip: []
        };

        return fact;
    });
}