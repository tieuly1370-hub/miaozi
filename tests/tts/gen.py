import asyncio, edge_tts
S = ["你好", "谢谢", "再见", "老师好", "我叫王生", "认识你很高兴", "我是学生", "她是我姐姐", "我家有五口人", "今天星期日", "我想去超市", "现在几点", "我不是老师", "你是中国人吗"]
V = ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"]
async def main():
    for v in V:
        for i, s in enumerate(S):
            await edge_tts.Communicate(s, v).save(f"{v.split('-')[2]}_{i:02d}.mp3")
asyncio.run(main())
open("sentences.txt", "w").write("\n".join(S))
